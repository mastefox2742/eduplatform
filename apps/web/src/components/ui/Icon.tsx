import { Icon as Iconify } from '@iconify/react'

/**
 * Icône du design system.
 *
 * Les maquettes emploient le jeu **Solar** via Iconify. Le code
 * historique utilise `lucide-react` ; les deux cohabitent le temps
 * de la reprise des écrans, mais tout nouvel écran passe par ici.
 *
 * Les noms suivent la nomenclature Iconify : `solar:users-group-rounded-outline`.
 * La variante `-bold` sert à l'élément actif ou mis en avant,
 * `-outline` au reste — c'est la règle suivie par les maquettes.
 */
interface IconProps {
  /** Nom Iconify complet, ex. `solar:wallet-money-outline`. */
  name: string
  size?: number
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
  return <Iconify icon={name} width={size} height={size} className={className} />
}

/**
 * Icônes du produit, nommées par leur rôle métier plutôt que par
 * leur dessin. Quand une icône change, elle change ici, et partout.
 *
 * Reprises telles quelles des maquettes.
 */
export const ICONS = {
  // Navigation principale
  dashboard:     'solar:widget-2-bold',
  dashboardIdle: 'solar:widget-2-outline',
  students:      'solar:users-group-rounded-outline',
  studentsBold:  'solar:users-group-rounded-bold',
  teachers:      'solar:user-speak-outline',
  classes:       'solar:users-group-two-rounded-outline',
  finance:       'solar:wallet-money-outline',
  financeBold:   'solar:wallet-money-bold',
  pedagogy:      'solar:notebook-bookmark-outline',
  discipline:    'solar:shield-warning-outline',
  reports:       'solar:document-add-outline',
  settings:      'solar:settings-outline',
  home:          'solar:home-smile-bold',
  homeIdle:      'solar:home-2-bold',

  // Pédagogie
  courses:       'solar:book-2-outline',
  courseMark:    'solar:book-bookmark-outline',
  homework:      'solar:document-add-outline',
  grades:        'solar:chart-square-outline',
  gradesBold:    'solar:chart-square-bold',
  checklist:     'solar:checklist-outline',
  checklistBold: 'solar:checklist-bold',
  attendance:    'solar:checklist-minimalistic-outline',
  bulletin:      'solar:diploma-verified-outline',
  bulletinBold:  'solar:diploma-verified-bold',
  diploma:       'solar:diploma-outline',
  lab:           'solar:test-tube-minimalistic-outline',
  geography:     'solar:globe-outline',

  // Finance
  payment:       'solar:banknote-2-outline',
  cashOut:       'solar:cash-out-outline',
  bill:          'solar:bill-list-bold',

  // Vie scolaire et statuts
  check:         'solar:check-circle-outline',
  checkBold:     'solar:check-circle-bold',
  close:         'solar:close-circle-outline',
  closeBold:     'solar:close-circle-bold',
  warning:       'solar:danger-triangle-outline',
  warningBold:   'solar:danger-triangle-bold',
  clock:         'solar:clock-circle-bold',
  shield:        'solar:shield-check-outline',
  shieldBold:    'solar:shield-check-bold',
  verified:      'solar:verified-check-outline',

  // Communication
  bell:          'solar:bell-outline',
  bellActive:    'solar:bell-bing-outline',
  chat:          'solar:chat-round-dots-outline',
  chatBold:      'solar:chat-line-bold',
  megaphone:     'mdi:megaphone',
  whatsapp:      'mdi:whatsapp',
  readReceipt:   'solar:check-read-outline',

  // Gamification
  fire:          'solar:fire-bold',
  trophy:        'solar:cup-star-outline',
  stars:         'solar:stars-line-outline',
  magic:         'solar:magic-stick-3-bold',

  // Documents et actions
  document:      'solar:document-text-outline',
  documentBold:  'solar:document-text-bold',
  download:      'solar:file-download-linear',
  upload:        'solar:cloud-upload-outline',
  synced:        'solar:cloud-check-bold',
  attachment:    'solar:paperclip-outline',
  camera:        'solar:camera-outline',
  edit:          'solar:pen-outline',
  editSquare:    'solar:pen-new-square-outline',
  eye:           'solar:eye-outline',
  search:        'solar:magnifer-outline',
  calendar:      'solar:calendar-outline',
  calendarBold:  'solar:calendar-date-bold',
  trend:         'solar:graph-up-outline',
  play:          'solar:play-circle-outline',
  keyboard:      'solar:keyboard-outline',

  // Compte
  profile:       'solar:user-circle-outline',
  userCheck:     'solar:user-check-bold',
  logout:        'solar:logout-2-outline',
  lock:          'solar:lock-password-bold',
  info:          'solar:info-circle-outline',
  chevronDown:   'solar:alt-arrow-down-outline',
  chevronRight:  'solar:alt-arrow-right-outline',
  back:          'solar:arrow-left-outline',
} as const

export type IconName = keyof typeof ICONS
