import { useTranslation } from 'react-i18next'

export function WizardStub() {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('scenarios.new')}</h1>
      <p className="text-muted-foreground mt-2">Wizard coming in next phase…</p>
    </div>
  )
}

export function ScenarioResultStub() {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('nav.scenarios')}</h1>
      <p className="text-muted-foreground mt-2">Result view coming in next phase…</p>
    </div>
  )
}

export function AdminUsersStub() {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('nav.admin_users')}</h1>
      <p className="text-muted-foreground mt-2">Coming soon…</p>
    </div>
  )
}

export function AdminEquipmentStub() {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('nav.admin_equipment')}</h1>
      <p className="text-muted-foreground mt-2">Coming soon…</p>
    </div>
  )
}
