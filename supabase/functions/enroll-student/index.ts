/**
 * Supabase Edge Function : enroll-student
 * Inscription individuelle d'un élève (backlog V1-11).
 *
 * Pourquoi une fonction serveur : créer un compte `auth.users` exige la
 * clé service role, qui ne doit jamais atteindre le navigateur. Le client
 * (clé anon) en est incapable, et c'est voulu.
 *
 * Garde-fou : le service role contourne la RLS. La fonction vérifie donc
 * elle-même que l'appelant a le droit d'inscrire, et elle dérive le
 * `school_id` du rôle de l'appelant — jamais d'une valeur envoyée par le
 * client. Sans cela, n'importe quel utilisateur authentifié pourrait
 * inscrire un élève dans n'importe quelle école.
 *
 * Runtime : Deno.  Deploy : supabase functions deploy enroll-student
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Rôles autorisés à inscrire un élève (staff_role, RBAC autoritaire).
const ENROLLERS = new Set(['super_admin', 'directeur', 'de', 'secretaire', 'gestionnaire'])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  // ── 1. Authentifier l'appelant ────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'unauthorized' }, 401)

  const url        = Deno.env.get('SUPABASE_URL')!
  const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await caller.auth.getUser()
  if (authError || !user) return json({ error: 'unauthorized' }, 401)

  // ── 2. Autoriser : rôle + école dérivés du serveur, pas du client ─────────
  // On lit les rôles via le client de l'appelant : la RLS de user_roles ne
  // laisse voir que ses propres lignes, donc c'est bien SON périmètre.
  const { data: roles, error: rolesError } = await caller
    .from('user_roles')
    .select('role, school_id, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (rolesError) return json({ error: 'roles_unreadable', detail: rolesError.message }, 500)

  const enrolling = (roles ?? []).find((r) => ENROLLERS.has(r.role))
  if (!enrolling) return json({ error: 'forbidden', detail: 'role insuffisant pour inscrire' }, 403)

  const schoolId: string = enrolling.school_id

  // ── 3. Valider l'entrée ───────────────────────────────────────────────────
  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const firstName = String(payload.firstName ?? '').trim()
  const lastName  = String(payload.lastName ?? '').trim()
  const classId   = payload.classId ? String(payload.classId) : null
  if (!firstName || !lastName) return json({ error: 'nom_prenom_requis' }, 400)

  // Service role : à partir d'ici on contourne la RLS, garde-fous déjà posés.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // 3b. La classe, si fournie, doit appartenir à l'école de l'appelant.
  let className: string | null = null
  let levelId:   string | null = null
  let levelName: string | null = null
  if (classId) {
    const { data: klass, error: kErr } = await admin
      .from('classes')
      .select('id, name, level_id, level_name, school_id, academic_year')
      .eq('id', classId)
      .single()
    if (kErr || !klass) return json({ error: 'classe_introuvable' }, 400)
    if (klass.school_id !== schoolId) return json({ error: 'classe_hors_ecole' }, 403)
    className = klass.name
    levelId   = klass.level_id
    levelName = klass.level_name
  }

  // 3c. Année scolaire courante de l'école.
  const { data: year } = await admin
    .from('academic_years')
    .select('label')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .maybeSingle()
  const academicYear: string = year?.label ?? new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)

  // ── 4. Matricule séquentiel (RPC next_student_number) ─────────────────────
  const { data: matricule, error: mErr } = await admin.rpc('next_student_number', { p_school_id: schoolId })
  if (mErr || !matricule) return json({ error: 'matricule_echec', detail: mErr?.message }, 500)

  // ── 5. Compte auth de l'élève ─────────────────────────────────────────────
  const providedEmail = payload.email ? String(payload.email).trim().toLowerCase() : ''
  const studentEmail  = providedEmail || `${String(matricule).toLowerCase()}@eleve.local`
  const tempPassword  = payload.password ? String(payload.password) : generatePassword()

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: studentEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { display_name: `${firstName} ${lastName}`, role: 'student', student_number: matricule },
  })
  if (cErr || !created?.user) {
    const dup = (cErr?.message ?? '').toLowerCase().includes('already')
    return json({ error: dup ? 'email_deja_utilise' : 'compte_echec', detail: cErr?.message }, dup ? 409 : 500)
  }
  const studentId = created.user.id

  // ── 6. Profil, rôle, parcours — rollback du compte auth si un pas échoue ──
  const rollback = async (why: string, detail?: string, status = 500) => {
    await admin.auth.admin.deleteUser(studentId).catch(() => {})
    return json({ error: why, detail }, status)
  }

  const { error: pErr } = await admin.from('profiles').insert({
    id: studentId,
    school_id: schoolId,
    role: 'student',                       // user_role (legacy, NOT NULL)
    display_name: `${firstName} ${lastName}`,
    student_number: matricule,
    class_id: classId,
    class_name: className,
    level_id: levelId,
    level_name: levelName,
    parent_email: payload.parentEmail ? String(payload.parentEmail).trim() : null,
    birth_date: payload.birthDate ? String(payload.birthDate) : null,
    gender: payload.gender ? String(payload.gender) : null,
    phone: payload.phone ? String(payload.phone) : null,
  })
  if (pErr) return rollback('profil_echec', pErr.message)

  const { error: rErr } = await admin.from('user_roles').insert({
    school_id: schoolId,
    user_id: studentId,
    role: 'eleve',                         // staff_role (RBAC autoritaire)
    scope_kind: 'school',
    granted_by: user.id,
  })
  if (rErr) return rollback('role_echec', rErr.message)

  const { error: eErr } = await admin.from('student_enrollments').insert({
    school_id: schoolId,
    student_id: studentId,
    academic_year: academicYear,
    class_id: classId,
    class_name: className,
    level_id: levelId,
    level_name: levelName,
    outcome: 'en_cours',
  })
  if (eErr) return rollback('inscription_echec', eErr.message)

  // 6b. Tuteur, si renseigné — sans compte auth pour l'instant (guardian_id null).
  const guardianName = payload.parentName ? String(payload.parentName).trim() : ''
  if (guardianName) {
    await admin.from('student_guardians').insert({
      school_id: schoolId,
      student_id: studentId,
      guardian_name: guardianName,
      guardian_email: payload.parentEmail ? String(payload.parentEmail).trim() : null,
      guardian_phone: payload.parentPhone ? String(payload.parentPhone).trim() : null,
      is_financial: true,
      is_primary: true,
    }).catch(() => {}) // un tuteur manquant ne doit pas annuler l'inscription
  }

  return json({
    ok: true,
    studentId,
    matricule,
    email: studentEmail,
    tempPassword,
    academicYear,
    className,
  }, 201)
})
