import Script from "next/script";

import type {
  TrackingConfig,
} from "@/lib/tracking-config";

/* =========================================================
   TYPES
   ========================================================= */

type TrackingScriptsProps = {
  config:
    TrackingConfig;
};

/* =========================================================
   TRACKING SCRIPTS
   ========================================================= */

export function TrackingScripts({
  config,
}: TrackingScriptsProps) {
  const gtmEnabled =
    config.gtm.enabled &&
    Boolean(
      config.gtm.containerId,
    );

  const metaEnabled =
    config.metaPixel.enabled &&
    Boolean(
      config.metaPixel.pixelId,
    );

  if (
    !gtmEnabled &&
    !metaEnabled
  ) {
    return null;
  }

  return (
    <>
      {/* =====================================================
          GOOGLE TAG MANAGER
          ===================================================== */}

      {gtmEnabled ? (
        <>
          <Script
            id="gog-gtm-bootstrap"
            strategy="afterInteractive"
          >
            {`
              (function(w,d,s,l,i){
                w[l]=w[l]||[];
                w[l].push({
                  'gtm.start': new Date().getTime(),
                  event:'gtm.js'
                });

                var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),
                    dl=l!='dataLayer'?'&l='+l:'';

                j.async=true;
                j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;

                f.parentNode.insertBefore(j,f);
              })(
                window,
                document,
                'script',
                'dataLayer',
                ${JSON.stringify(
                  config.gtm
                    .containerId,
                )}
              );
            `}
          </Script>

          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(
                config.gtm
                  .containerId,
              )}`}
              height="0"
              width="0"
              style={{
                display:
                  "none",
                visibility:
                  "hidden",
              }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      ) : null}

      {/* =====================================================
          META PIXEL BASE
          ===================================================== */}

      {metaEnabled ? (
        <>
          <Script
            id="gog-meta-pixel-bootstrap"
            strategy="afterInteractive"
          >
            {`
              !function(f,b,e,v,n,t,s)
              {
                if(f.fbq)return;

                n=f.fbq=function(){
                  n.callMethod
                    ? n.callMethod.apply(n,arguments)
                    : n.queue.push(arguments)
                };

                if(!f._fbq)f._fbq=n;

                n.push=n;
                n.loaded=!0;
                n.version='2.0';
                n.queue=[];

                t=b.createElement(e);
                t.async=!0;
                t.src=v;

                s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)
              }(
                window,
                document,
                'script',
                'https://connect.facebook.net/en_US/fbevents.js'
              );

              fbq(
                'init',
                ${JSON.stringify(
                  config.metaPixel
                    .pixelId,
                )}
              );
            `}
          </Script>

          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{
                display:
                  "none",
              }}
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(
                config.metaPixel
                  .pixelId,
              )}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      ) : null}
    </>
  );
}