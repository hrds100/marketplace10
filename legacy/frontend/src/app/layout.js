import localFont from 'next/font/local'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { ParticleConnectkit } from '@/context/ParticleConnectkit'
import { nfstayContextProvider } from '@/context/nfstayContext'
import { KYCModalProvider } from '@/context/KYCModalContext'
import { BulkBuyProvider } from '@/context/BulkBuyContext'
import NextTopLoader from 'nextjs-toploader'
import KycModal from '@/utils/kycModal'
import IOSNotificationModal from '@/utils/iOSNotificationModal'
import LoginPopup from '@/utils/loginPopup'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900'
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900'
})

export const metadata = {
  title: 'nfstay',
  description: `nfstay is a platform that allows you to invest in real estate using NFTs. Invest in income-generating real estate, easily. Create your profile in 3 minutes, choose property and invest, withdraw or reinvest your monthly earnings.`
}

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <head>
        <link rel='manifest' href='/manifest.json' />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader color='#954AFC' height={5} showSpinner={false} />

        <Toaster position='top-center' />
        <ParticleConnectkit>
          <nfstayContextProvider>
            <KYCModalProvider>
              <BulkBuyProvider>
                <KycModal>
                  <IOSNotificationModal />
                  {children}
                  <LoginPopup />
                </KycModal>
              </BulkBuyProvider>
            </KYCModalProvider>
          </nfstayContextProvider>
        </ParticleConnectkit>
      </body>
    </html>
  )
}
