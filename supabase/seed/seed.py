# -*- coding: utf-8 -*-
"""
Jeu de donnees de depart — Lycee La Reference, Brazzaville.

Cree un etablissement complet et coherent : une annee scolaire ouverte,
quatre classes, sept matieres, cinq membres du personnel, vingt-quatre
eleves avec leurs responsables, la facturation de scolarite, des
evaluations notees et des paiements.

## Pourquoi un vrai jeu plutot que des lignes de test

Un seed a trois lignes ne montre rien : ni un taux de recouvrement, ni
une moyenne de classe, ni un impaye. Les ecrans se jugent avec des
donnees qui ont la forme du reel — des classes inegales, des eleves en
difficulte, des familles a jour et d'autres non.

## Ce que ce script fait, et ne fait pas

Il ecrit avec la cle `service_role`, qui traverse les RLS. C'est
volontaire : il n'y a pas encore d'utilisateur connecte pour creer la
premiere ecole. C'est aussi pourquoi il ne doit jamais tourner ailleurs
qu'en developpement.

Il est **idempotent** : relance, il efface l'ecole precedente et sa
descendance avant de reconstruire. Sans cela, la deuxieme execution
laisse une base pleine de doublons impossibles a distinguer.

## Usage

    python supabase/seed/seed.py

Lit SUPABASE_SERVICE_ROLE_KEY dans .env.supabase a la racine.
"""
import io
import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from datetime import date, timedelta

PROJET = 'niuuropuwxefctoulpml'
BASE = 'https://%s.supabase.co' % PROJET
RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')

# Mot de passe commun aux comptes de demonstration. Ce jeu n'a pas
# vocation a contenir de donnee reelle ; le jour ou une vraie ecole
# arrive, ce script ne doit pas tourner sur sa base.
MOT_DE_PASSE = 'Demo2026!Alpha'

ANNEE = '2025-2026'

# Toutes les adresses du jeu se terminent par ce domaine : c'est ce qui
# permet de les retrouver pour les effacer.
DOMAINE = 'lareference.cg'


# ── Acces ────────────────────────────────────────────────────────────

def cle_service():
    chemin = os.path.join(RACINE, '.env.supabase')
    if not os.path.exists(chemin):
        sys.exit("Fichier .env.supabase introuvable a la racine du depot.")
    for ligne in io.open(chemin, encoding='utf-8'):
        if ligne.startswith('SUPABASE_SERVICE_ROLE_KEY='):
            return ligne.split('=', 1)[1].strip()
    sys.exit("SUPABASE_SERVICE_ROLE_KEY absente de .env.supabase.")


CLE = cle_service()


def appel(methode, chemin, corps=None, entetes=None):
    url = BASE + chemin
    donnees = json.dumps(corps).encode('utf-8') if corps is not None else None
    req = urllib.request.Request(url, data=donnees, method=methode)
    req.add_header('apikey', CLE)
    req.add_header('Authorization', 'Bearer ' + CLE)
    req.add_header('Content-Type', 'application/json')
    for k, v in (entetes or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as r:
            brut = r.read().decode('utf-8')
            return json.loads(brut) if brut.strip() else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')
        raise RuntimeError('%s %s -> %s\n%s' % (methode, chemin, e.code, detail))


def inserer(table, lignes):
    """Insere et renvoie les lignes creees. Une liste vide n'appelle rien."""
    if not lignes:
        return []
    res = appel('POST', '/rest/v1/' + table, lignes,
                {'Prefer': 'return=representation'})
    return res or []


def creer_compte(email, nom):
    """Cree un utilisateur authentifiable. Renvoie son identifiant."""
    res = appel('POST', '/auth/v1/admin/users', {
        'email': email,
        'password': MOT_DE_PASSE,
        'email_confirm': True,
        'user_metadata': {'display_name': nom},
    })
    return res['id']


# ── Nettoyage ────────────────────────────────────────────────────────

def effacer_ecole(slug):
    """Efface l'ecole, ses donnees et ses comptes.

    L'ordre est contraint par les cles etrangeres, et il n'est pas
    intuitif. Cent vingt colonnes pointent vers `profiles` sans
    ON DELETE CASCADE — `classes.main_teacher_id`,
    `assessments.teacher_id`, `invoices.guardian_id`… Les supprimer une
    a une dans le bon ordre n'est pas tenable et casserait au premier
    ajout de table.

    Trois etapes suffisent, en s'appuyant sur les cascades qui existent
    deja :

      1. Detacher les profils de l'ecole (`school_id` a NULL). C'est la
         seule contrainte qui empeche l'ecole de partir.
      2. Supprimer l'ecole. Tout ce qui porte un `school_id` est en
         CASCADE et disparait : classes, evaluations, factures, notes.
         Les references vers `profiles` s'en vont avec.
      3. Supprimer les comptes. `profiles.id` reference `auth.users` en
         CASCADE, donc les profils suivent — plus rien ne les retient.
    """
    ecoles = appel('GET', '/rest/v1/schools?slug=eq.%s&select=id' % slug)
    if ecoles:
        ident = ecoles[0]['id']
        appel('PATCH', '/rest/v1/profiles?school_id=eq.%s' % ident,
              {'school_id': None})
        appel('DELETE', '/rest/v1/schools?id=eq.%s' % ident)
    return effacer_comptes()


def effacer_comptes():
    """Efface les comptes de demonstration, identifies par leur domaine.

    On ne peut pas se contenter des profils rattaches a l'ecole : une
    execution interrompue laisse des comptes crees mais pas encore
    profiles, invisibles a une recherche par `school_id`. La deuxieme
    execution echouait alors sur `email_exists`, sans indice sur la
    cause. Le domaine est le seul critere qui les retrouve tous.

    Les echecs ne sont pas avales. Une premiere version les ignorait en
    silence : trois comptes survivaient a chaque passage, retenus par
    `classes.main_teacher_id`, et le script echouait quinze etapes plus
    loin sur un message sans rapport. Un nettoyage qui ne dit pas ce
    qu'il n'a pas pu faire coute plus cher qu'il ne rapporte.
    """
    efface, bloques = 0, []
    for page in range(1, 20):
        lot = appel('GET',
                    '/auth/v1/admin/users?page=%d&per_page=200' % page)
        utilisateurs = (lot or {}).get('users') or []
        if not utilisateurs:
            break
        for u in utilisateurs:
            if not (u.get('email') or '').endswith(DOMAINE):
                continue
            try:
                appel('DELETE', '/auth/v1/admin/users/' + u['id'])
                efface += 1
            except RuntimeError as e:
                bloques.append((u['email'], str(e).splitlines()[-1]))

    if bloques:
        print('  %d compte(s) impossible(s) a supprimer :' % len(bloques))
        for email, motif in bloques:
            print('    %s — %s' % (email, motif))
        sys.exit("Nettoyage incomplet : relancer apres avoir leve ces "
                 "references.")
    return efface


# ── Donnees ──────────────────────────────────────────────────────────

PERSONNEL = [
    # (cle, email, nom, role profil, role staff, matieres)
    ('nsimba',  'direction@lareference.cg', 'Mme Nsimba Bernadette',
     'direction', 'directeur',   []),
    ('makosso', 'de@lareference.cg',        'M. Makosso Andre',
     'direction', 'de',          []),
    ('okemba',  'okemba@lareference.cg',    'M. Okemba Jean-Paul',
     'teacher',   'enseignant',  ['Mathematiques']),
    ('mabiala', 'mabiala@lareference.cg',   'Mme Mabiala Sylvie',
     'teacher',   'enseignant',  ['Francais']),
    ('ngoma',   'ngoma@lareference.cg',     'Mme Ngoma Clarisse',
     'teacher',   'enseignant',  ['SVT']),
]

MATIERES = [
    ('Mathematiques',    'MATH', 4, '#145DA0', 'M'),
    ('Francais',         'FR',   4, '#B33F62', 'F'),
    ('SVT',              'SVT',  2, '#2E9E6B', 'S'),
    ('Physique-Chimie',  'PC',   3, '#7A4FBF', 'P'),
    ('Histoire-Geo',     'HG',   2, '#C8792B', 'H'),
    ('Anglais',          'ANG',  2, '#1F7A8C', 'A'),
    ('EPS',              'EPS',  1, '#5A6B7B', 'E'),
]

CLASSES = [
    ('6eme A', '6eme', 'college', 'mabiala'),
    ('5eme A', '5eme', 'college', 'ngoma'),
    ('4eme A', '4eme', 'college', 'okemba'),
    ('3eme A', '3eme', 'college', 'okemba'),
]

# Scolarite annuelle par niveau, en francs CFA.
TARIFS = {'6eme': 180000, '5eme': 190000, '4eme': 205000, '3eme': 225000}

# (prenom nom, sexe, classe, responsable, relation, telephone,
#  part payee de la scolarite)
ELEVES = [
    ('Chris Ondongo',      'M', '6eme A', 'Mme Ondongo Prisca',    'mere', '+242 06 331 09 55', 0.33),
    ('Merveille Loemba',   'F', '6eme A', 'Mme Loemba Antoinette', 'mere', '+242 06 512 33 90', 1.00),
    ('Kevin Massamba',     'M', '6eme A', 'M. Massamba Rodrigue',  'pere', '+242 05 771 20 14', 1.00),
    ('Sarah Bikindou',     'F', '6eme A', 'Mme Bikindou Josephine', 'mere', '+242 06 220 45 78', 0.66),
    ('Emmanuel Tchibinda', 'M', '6eme A', 'M. Tchibinda Blaise',   'pere', '+242 05 118 90 32', 1.00),
    ('Lydie Ngouabi',      'F', '6eme A', 'Mme Ngouabi Solange',   'mere', '+242 06 445 71 20', 0.33),

    ('Gloire Batchi',      'M', '5eme A', 'M. Batchi Celestin',    'pere', '+242 05 220 77 41', 1.00),
    ('Divine Kouka',       'F', '5eme A', 'M. Kouka Fabrice',      'pere', '+242 05 118 62 30', 0.66),
    ('Josue Milandou',     'M', '5eme A', 'Mme Milandou Chantal',  'mere', '+242 06 909 12 45', 1.00),
    ('Esther Nkodia',      'F', '5eme A', 'M. Nkodia Prosper',     'pere', '+242 05 447 33 21', 0.33),
    ('Brice Samba',        'M', '5eme A', 'Mme Samba Georgette',   'mere', '+242 06 771 55 09', 1.00),
    ('Rachel Loubaki',     'F', '5eme A', 'Mme Loubaki Estelle',   'mere', '+242 06 118 44 72', 0.66),

    ('Prince Mavoungou',   'M', '4eme A', 'M. Mavoungou Roger',    'pere', '+242 05 447 12 08', 1.00),
    ('Naomi Mabiala',      'F', '4eme A', 'Mme Mabiala Sylvie',    'mere', '+242 06 774 10 25', 1.00),
    ('Steve Bouiti',       'M', '4eme A', 'M. Bouiti Armand',      'pere', '+242 05 330 21 76', 0.33),
    ('Carine Nzaba',       'F', '4eme A', 'Mme Nzaba Berthe',      'mere', '+242 06 552 90 41', 0.66),
    ('Yann Goma',          'M', '4eme A', 'M. Goma Sylvain',       'pere', '+242 05 771 63 18', 1.00),
    ('Sandra Tsona',       'F', '4eme A', 'Mme Tsona Alphonsine',  'mere', '+242 06 209 77 33', 1.00),

    ('Destin Moukoko',     'M', '3eme A', 'M. Moukoko Bernard',    'pere', '+242 06 445 21 09', 1.00),
    ('Grace Mampouya',     'F', '3eme A', 'Mme Mampouya Eliane',   'mere', '+242 05 337 88 14', 0.66),
    ('Elie Nguesso',       'M', '3eme A', 'M. Nguesso Patrick',    'pere', '+242 06 112 45 78', 0.33),
    ('Junior Bantsimba',   'M', '3eme A', 'Mme Bantsimba Claudine', 'mere', '+242 05 909 33 62', 0.00),
    ('Naomi Tchicaya',     'F', '3eme A', 'Mme Tchicaya Bernadette', 'mere', '+242 06 890 44 12', 1.00),
    ('Franck Ibara',       'M', '3eme A', 'M. Ibara Dieudonne',    'pere', '+242 05 220 11 87', 1.00),
]

# Notes du devoir de mathematiques de 3eme A. Ecrites a la main plutot
# que tirees au hasard : la 3eme A doit raconter quelque chose. Junior
# et Elie decrochent, ce que l'ecran « Eleves en difficulte » doit
# retrouver en croisant ces notes avec leurs impayes.
NOTES_MATHS_3EME = {
    'Destin Moukoko':   15.5,
    'Grace Mampouya':   16.5,
    'Elie Nguesso':      8.5,
    'Junior Bantsimba':  6.0,
    'Naomi Tchicaya':   14.0,
    'Franck Ibara':     12.5,
}


# ── Construction ─────────────────────────────────────────────────────

def main():
    print('Projet %s' % PROJET)
    print('Nettoyage...')
    n = effacer_ecole('la-reference')
    if n:
        print('  ecole precedente effacee, %d compte(s) supprime(s)' % n)

    # 1. Etablissement
    ecole = inserer('schools', [{
        'name': 'Lycee La Reference',
        'slug': 'la-reference',
        'address_city': 'Brazzaville',
        'address_country': 'CG',
        'contact_email': 'contact@lareference.cg',
        'plan': 'pro',
        'status': 'active',
        'academic_year': ANNEE,
        'features': {'aiEnabled': True, 'examBank': True, 'analytics': True},
    }])[0]
    eid = ecole['id']
    print('Ecole    %s' % ecole['name'])

    # 2. Annee scolaire et trimestres
    debut = date(2025, 9, 15)
    annee = inserer('academic_years', [{
        'school_id': eid, 'label': ANNEE,
        'starts_on': str(debut), 'ends_on': '2026-07-10',
        'period_kind': 'trimestre', 'is_current': True, 'is_closed': False,
    }])[0]

    trimestres = [
        ('T1', '1er trimestre', 1, '2025-09-15', '2025-12-19'),
        ('T2', '2e trimestre',  2, '2026-01-05', '2026-03-27'),
        ('T3', '3e trimestre',  3, '2026-04-06', '2026-07-10'),
    ]
    periodes = inserer('academic_periods', [{
        'school_id': eid, 'year_id': annee['id'], 'code': c, 'label': l,
        'order_num': o, 'starts_on': d, 'ends_on': f,
        # Seul le trimestre en cours accepte des notes. Les periodes
        # closes doivent l'etre : c'est la regle §13.1, et un seed qui
        # laisse tout ouvert empeche de la verifier a l'ecran.
        'is_locked': c != 'T3',
    } for c, l, o, d, f in trimestres])
    t3 = next(p for p in periodes if p['code'] == 'T3')
    print('Annee    %s, 3 trimestres (T1 et T2 verrouilles)' % ANNEE)

    # 3. Matieres
    matieres = inserer('subjects', [{
        'school_id': eid, 'name': n, 'short_name': s, 'coefficient': c,
        'color': col, 'icon_emoji': e, 'is_active': True,
    } for n, s, c, col, e in MATIERES])
    par_matiere = {m['name']: m for m in matieres}
    print('Matieres %d' % len(matieres))

    # 4. Comptes du personnel
    equipe = {}
    for cle, email, nom, role, _staff, mats in PERSONNEL:
        uid = creer_compte(email, nom)
        equipe[cle] = {'id': uid, 'nom': nom, 'email': email,
                       'role': role, 'matieres': mats}
    print('Personnel %d comptes' % len(equipe))

    # 5. Profils du personnel — avant les classes : `main_teacher_id`
    #    porte une cle etrangere vers `profiles`.
    inserer('profiles', [{
        'id': m['id'], 'school_id': eid, 'role': m['role'],
        'display_name': m['nom'], 'is_active': True,
        'subjects': m['matieres'] or None,
        'employee_id': 'EMP-%03d' % (i + 1),
    } for i, m in enumerate(equipe.values())])

    # 5. Classes
    classes = inserer('classes', [{
        'school_id': eid, 'name': nom, 'level_name': niveau,
        'academic_year': ANNEE,
        'main_teacher_id': equipe[prof]['id'],
        'main_teacher_name': equipe[prof]['nom'],
        'student_count': 0, 'is_active': True,
    } for nom, niveau, _cycle, prof in CLASSES])
    par_classe = {c['name']: c for c in classes}
    print('Classes  %s' % ', '.join(c['name'] for c in classes))

    # 6. Roles et affectations
    inserer('user_roles', [{
        'school_id': eid, 'user_id': equipe[cle]['id'], 'role': staff,
        'academic_year': ANNEE, 'is_active': True,
    } for cle, _e, _n, _r, staff, _m in PERSONNEL])

    affectations = []
    for nom_classe, _niv, _cyc, _pp in CLASSES:
        cl = par_classe[nom_classe]
        for cle, mat, heures in (('okemba', 'Mathematiques', 5),
                                 ('mabiala', 'Francais', 5),
                                 ('ngoma', 'SVT', 3)):
            affectations.append({
                'school_id': eid, 'teacher_id': equipe[cle]['id'],
                'class_id': cl['id'], 'subject_id': par_matiere[mat]['id'],
                'academic_year': ANNEE, 'hours_week': heures,
                'is_main_teacher': cl['main_teacher_id'] == equipe[cle]['id'],
                'is_active': True,
            })
    inserer('teacher_assignments', affectations)
    print('Affectations %d' % len(affectations))

    # 7. Eleves : compte, profil, inscription, responsable
    profils, inscriptions, tuteurs = [], [], []
    eleves = []

    for i, (nom, sexe, nom_classe, resp, relation, tel, part) in enumerate(ELEVES):
        cl = par_classe[nom_classe]
        email = '%s@eleve.lareference.cg' % (
            nom.lower().replace(' ', '.').replace("'", ''))
        uid = creer_compte(email, nom)
        eleves.append({'id': uid, 'nom': nom, 'classe': cl,
                       'niveau': cl['level_name'], 'part': part,
                       'resp': resp, 'tel': tel})

        profils.append({
            'id': uid, 'school_id': eid, 'role': 'student',
            'display_name': nom, 'is_active': True,
            'class_id': cl['id'], 'class_name': cl['name'],
            'level_name': cl['level_name'],
            'student_number': 'ELV-%s-%03d' % (ANNEE[:4], i + 1),
            'gender': sexe, 'phone': tel,
        })
        inscriptions.append({
            'school_id': eid, 'student_id': uid, 'academic_year': ANNEE,
            'class_id': cl['id'], 'class_name': cl['name'],
            'level_name': cl['level_name'], 'enrolled_at': str(debut),
        })
        tuteurs.append({
            'school_id': eid, 'student_id': uid,
            'guardian_name': resp, 'guardian_phone': tel,
            'guardian_whatsapp': tel, 'relation': relation,
            'is_financial': True, 'is_emergency': True,
            'can_pickup': True, 'is_primary': True,
        })

    inserer('profiles', profils)
    inserer('student_enrollments', inscriptions)
    inserer('student_guardians', tuteurs)
    print('Eleves   %d, avec inscription et responsable' % len(eleves))

    for nom_classe, _n, _c, _p in CLASSES:
        cl = par_classe[nom_classe]
        n = sum(1 for e in eleves if e['classe']['id'] == cl['id'])
        appel('PATCH', '/rest/v1/classes?id=eq.%s' % cl['id'],
              {'student_count': n})

    # 8. Facturation
    grilles = inserer('fee_structures', [{
        'school_id': eid, 'academic_year': ANNEE, 'cycle': 'college',
        'name': 'Scolarite %s — %s' % (niv, ANNEE), 'is_active': True,
    } for niv in TARIFS])
    par_grille = {g['name'].split('—')[0].split()[-1]: g for g in grilles}

    factures, lignes_facture, echeances, paiements = [], [], [], []
    for i, e in enumerate(eleves):
        total = TARIFS[e['niveau']]
        regle = int(round(total * e['part']))
        fid = str(uuid.uuid4())

        factures.append({
            'id': fid, 'school_id': eid, 'student_id': e['id'],
            'academic_year': ANNEE,
            'invoice_num': 'FAC-%s-%04d' % (ANNEE[:4], 300 + i),
            'structure_id': par_grille[e['niveau']]['id'],
            'gross_amount': total, 'discount_amount': 0,
            # `balance` est une colonne generee : net moins paye. Elle se
            # recalcule seule quand le trigger on_payment_success passe.
            'net_amount': total, 'paid_amount': 0,
            'currency': 'XOF', 'status': 'emise',
            'issued_at': str(debut), 'due_date': '2026-06-15',
        })

        # La ligne de facture n'est pas decorative : `recompute_invoice()`
        # recalcule le montant de la facture a partir d'elle. Une facture
        # sans ligne tomberait a zero des le premier paiement.
        lignes_facture.append({
            'invoice_id': fid,
            'label': 'Scolarite annuelle %s — %s' % (e['niveau'], ANNEE),
            'amount': total, 'discount': 0,
        })

        # Trois tranches, echelonnees sur l'annee. Les tranches echues et
        # non reglees produisent les impayes que l'ecran doit montrer.
        tranche = total // 3
        for n in range(3):
            montant = tranche if n < 2 else total - 2 * tranche
            regle_ici = max(0, min(montant, regle - n * tranche))
            echeances.append({
                'school_id': eid, 'invoice_id': fid, 'student_id': e['id'],
                'number': n + 1, 'label': 'Tranche %d' % (n + 1),
                'amount': montant, 'paid_amount': regle_ici,
                'due_date': ['2025-10-15', '2026-01-15', '2026-04-15'][n],
                # `is_paid` est generee a partir de paid_amount >= amount.
            })

        if regle > 0:
            paiements.append({
                'school_id': eid, 'student_id': e['id'],
                'student_name': e['nom'], 'parent_name': e['resp'],
                'invoice_id': fid, 'amount': regle, 'currency': 'XOF',
                'status': 'success', 'network': 'MTN' if i % 2 else 'Airtel',
                'provider': 'cinetpay',
                'transaction_id': 'TX-SEED-%04d' % i,
                'idempotency_key': 'seed-%s' % fid,
                'webhook_verified': True,
                'date': '2025-10-12', 'paid_at': '2025-10-12T09:30:00Z',
            })

    inserer('invoices', factures)
    inserer('invoice_lines', lignes_facture)
    inserer('installments', echeances)
    inserer('payments', paiements)

    du = sum(f['net_amount'] for f in factures)
    encaisse = sum(p['amount'] for p in paiements)
    print('Finance  %d factures, %d tranches, %d paiements' % (
        len(factures), len(echeances), len(paiements)))
    print('         facture %s FCFA, encaisse %s FCFA (%d %%)' % (
        '{:,}'.format(du).replace(',', ' '),
        '{:,}'.format(encaisse).replace(',', ' '),
        round(encaisse * 100 / du)))

    # 9. Une evaluation notee en 3eme A
    troisieme = par_classe['3eme A']
    devoir = inserer('assessments', [{
        'school_id': eid, 'class_id': troisieme['id'],
        'subject_id': par_matiere['Mathematiques']['id'],
        'subject_name': 'Mathematiques',
        'teacher_id': equipe['okemba']['id'],
        'teacher_name': equipe['okemba']['nom'],
        'period_id': t3['id'], 'academic_year': ANNEE,
        'kind': 'devoir', 'title': 'Devoir surveille n2 — Theoreme de Thales',
        'max_score': 20, 'coefficient': 2,
        'date': str(date.today() - timedelta(days=6)),
        'duration_min': 120,
    }])[0]

    notes = []
    for e in eleves:
        if e['nom'] in NOTES_MATHS_3EME:
            notes.append({
                'school_id': eid, 'assessment_id': devoir['id'],
                'student_id': e['id'],
                'score': NOTES_MATHS_3EME[e['nom']],
                'state': 'saisie', 'entered_by': equipe['okemba']['id'],
            })
    inserer('grades', notes)
    moy = sum(NOTES_MATHS_3EME.values()) / len(NOTES_MATHS_3EME)
    print('Notes    %d en 3eme A, moyenne %.2f/20' % (len(notes), moy))

    print()
    print('Comptes de demonstration — mot de passe commun : %s' % MOT_DE_PASSE)
    for cle, email, nom, role, _s, _m in PERSONNEL:
        print('  %-9s %-28s %s' % (role, email, nom))
    print('  %-9s %-28s %s' % (
        'student', ELEVES[18][0].lower().replace(' ', '.') +
        '@eleve.lareference.cg', ELEVES[18][0]))


if __name__ == '__main__':
    main()
