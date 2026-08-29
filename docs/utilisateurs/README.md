# Documentation utilisateur — Projetto1

Livrable §28 du cahier des charges.

Une fiche par rôle. Chacune se lit en dix minutes et se distribue seule :
inutile de lire les autres pour comprendre la sienne.

| Rôle | Fiche | Support |
|---|---|---|
| Directeur | [directeur.md](directeur.md) | Web et mobile |
| Directeur des Études | [directeur-etudes.md](directeur-etudes.md) | Web |
| Surveillant Général | [surveillant-general.md](surveillant-general.md) | Mobile |
| Secrétaire | [secretaire.md](secretaire.md) | Web |
| Gestionnaire / Caissier | [gestionnaire.md](gestionnaire.md) | Mobile et web |
| Enseignant | [enseignant.md](enseignant.md) | Mobile et web |
| Parent | [parent.md](parent.md) | Mobile |
| Élève | [eleve.md](eleve.md) | Mobile |

---

## Ce que ces fiches disent, et ne disent pas

**Elles décrivent ce qui existe aujourd'hui.** Une fonction annoncée dans
le cahier des charges mais pas encore construite est signalée comme telle,
avec la mention « à venir ». Une documentation qui décrit un écran
inexistant fait perdre plus de temps qu'elle n'en fait gagner.

**Elles disent aussi ce que vous ne pouvez pas faire.** Chaque fiche a une
section « Ce que vous ne verrez pas ». Ce n'est pas une limitation
technique : c'est une décision. Un enseignant ne voit pas les données
médicales de ses élèves parce qu'il n'en a pas besoin pour enseigner, et
un parent ne voit que ses propres enfants.

---

## Trois choses valables pour tout le monde

### Le mode hors ligne n'est pas une panne

Sur une connexion instable, l'application continue de fonctionner. Vous
pouvez faire l'appel, saisir des notes, encaisser un règlement. Ces
opérations partent dès que le réseau revient.

Un bandeau vous dit toujours où vous en êtes :

| Ce que vous lisez | Ce que ça signifie |
|---|---|
| **Synchronisé** | Tout est parti, le serveur a confirmé |
| **3 en attente d'envoi** | Trois opérations sont sur votre téléphone, pas encore sur le serveur |
| **Hors ligne · saisie possible** | Pas de réseau, mais vous pouvez continuer à travailler |

L'application ne dira jamais « enregistré » avant que le serveur ne l'ait
confirmé. Si elle affiche « en attente », c'est que ce n'est pas encore
parti — et c'est une information utile, pas un dysfonctionnement.

### Le tiret « — » veut dire « on ne sait pas encore »

Vous verrez parfois un tiret à la place d'un chiffre. Cela signifie que la
donnée n'existe pas encore, pas qu'elle vaut zéro.

Un taux d'assiduité à « — » à sept heures du matin veut dire que l'appel
n'a pas commencé. S'il affichait « 0 % », vous croiriez que personne n'est
venu.

### Les couleurs ont un sens fixe

| Couleur | Signification |
|---|---|
| **Bleu** | Information, action principale |
| **Vert-bleu** | Validé, présent, réglé, réussi |
| **Ambre** | En attente, échéance proche, à vérifier |
| **Rouge** | En retard, absent non justifié, grave |

Vous devez pouvoir lire un écran à la couleur avant d'en lire le texte.

---

## En cas de problème

**« Je ne vois pas une donnée que je devrais voir. »**
Vérifiez d'abord l'année scolaire et la période affichées en haut de
l'écran. La plupart des cas viennent d'un contexte resté sur l'année
précédente.

**« L'application refuse mon action. »**
Le message vous dit pourquoi. Les deux causes les plus fréquentes : la
période de saisie est fermée par le Directeur des Études, ou l'action ne
relève pas de votre rôle.

**« J'ai des opérations en attente depuis longtemps. »**
Ouvrez l'application avec du réseau et laissez-la au premier plan quelques
secondes. Si le compteur ne descend pas, signalez-le : une opération peut
être en conflit avec une modification faite ailleurs.

**Ne créez jamais un second compte** pour contourner un blocage. Si vous
cumulez deux fonctions dans l'école, votre compte peut porter deux rôles :
demandez-le à la direction.
