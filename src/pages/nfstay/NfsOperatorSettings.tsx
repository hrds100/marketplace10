import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SettingsProfile from '@/components/nfstay/settings/SettingsProfile';
import SettingsContact from '@/components/nfstay/settings/SettingsContact';
import SettingsBranding from '@/components/nfstay/settings/SettingsBranding';
import SettingsSocial from '@/components/nfstay/settings/SettingsSocial';
import SettingsStripe from '@/components/nfstay/settings/SettingsStripe';
import SettingsHospitable from '@/components/nfstay/settings/SettingsHospitable';
import SettingsAnalytics from '@/components/nfstay/settings/SettingsAnalytics';
import SettingsDomain from '@/components/nfstay/settings/SettingsDomain';
import NfsPromoCodeManager from '@/components/nfstay/reservations/NfsPromoCodeManager';

interface NfsOperatorSettingsProps {
  onGatedAction?: (action: () => void) => void;
}

export default function NfsOperatorSettings({ onGatedAction }: NfsOperatorSettingsProps = {}) {
  const { operator, loading, error } = useNfsOperator();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">No operator account found.</p>
      </div>
    );
  }

  return (
    <div data-feature="BOOKING_NFSTAY__SETTINGS" className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger data-feature="BOOKING_NFSTAY__SETTINGS_PROFILE" value="profile">Profile</TabsTrigger>
          <TabsTrigger data-feature="BOOKING_NFSTAY__SETTINGS_CONTACT" value="contact">Contact</TabsTrigger>
          <TabsTrigger data-feature="BOOKING_NFSTAY__SETTINGS_BRANDING" value="branding">Branding</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="promo">Promo Codes</TabsTrigger>
          <TabsTrigger data-feature="BOOKING_NFSTAY__SETTINGS_STRIPE" value="stripe">Stripe</TabsTrigger>
          <TabsTrigger data-feature="BOOKING_NFSTAY__SETTINGS_HOSPITABLE" value="hospitable">Hospitable</TabsTrigger>
          <TabsTrigger data-feature="BOOKING_NFSTAY__SETTINGS_DOMAIN" value="domain">Domain</TabsTrigger>
          <TabsTrigger data-feature="BOOKING_NFSTAY__SETTINGS_ANALYTICS" value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="profile">
            <SettingsProfile operator={operator} onGatedAction={onGatedAction} />
          </TabsContent>
          <TabsContent value="contact">
            <SettingsContact operator={operator} onGatedAction={onGatedAction} />
          </TabsContent>
          <TabsContent value="branding">
            <SettingsBranding operator={operator} onGatedAction={onGatedAction} />
          </TabsContent>
          <TabsContent value="social">
            <SettingsSocial operator={operator} onGatedAction={onGatedAction} />
          </TabsContent>
          <TabsContent value="promo">
            <NfsPromoCodeManager onGatedAction={onGatedAction} />
          </TabsContent>
          <TabsContent value="stripe">
            <SettingsStripe onGatedAction={onGatedAction} />
          </TabsContent>
          <TabsContent value="hospitable">
            <SettingsHospitable onGatedAction={onGatedAction} />
          </TabsContent>
          <TabsContent value="domain">
            <SettingsDomain operator={operator} onGatedAction={onGatedAction} />
          </TabsContent>
          <TabsContent value="analytics">
            <SettingsAnalytics operator={operator} onGatedAction={onGatedAction} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
