import { LOGOS, absolutePublicUrl } from "@/src/config/logos";

export const baseTemplate = (body: string, email: string): string => {
  const logoUrl = absolutePublicUrl(LOGOS.wordmark);
  const headerBrand =
    logoUrl.length > 0
      ? `<img src="${logoUrl}" alt="My Ukoo" width="200" style="max-width:200px;height:auto;padding:12px 0;display:block;margin:0 auto;" />`
      : `<p style="font-size: 32px; color: white; margin: 0; letter-spacing: 0.05em;">MY UKOO</p>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Ukoo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
          rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet">
    <style>
        .content {display: block !important; padding: 10px !important;}
        .btn{background-color: #215563;padding: 10px 20px;border-radius: 12px; color: white; font-weight: 600; border: none; cursor: pointer;}
        .element-padding-x{padding-left: 20px !important; padding-right: 20px !important }
        @media screen and (max-width: 600px) {
            .content {width: 100% !important;display: block !important;padding: 10px !important;}
            /*.header, .body, .footer {padding: 20px !important;}*/
            .element-padding-x{padding-left: 10px !important; padding-right: 10px !important }
        }
         .footer{ background-color: #261516;}
         @media (prefers-color-scheme: dark) {
          .no-dark-mode {
            background-color: #261516 !important; /* Re-define to ensure no change */
            color: white !important;
          }
          .footer{
            background-color: #261516;
          }
        }
    </style>
</head>
<body style="font-family: 'DM Sans', Arial, sans-serif">

<table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
        <td align="center">
            <table class="content" width="600" border="0" cellspacing="0" cellpadding="0"
                   style="border-collapse: collapse; background-color: rgb(128,128,128, 0.1);">
                <!-- Header -->
                <tr>
                    <td class="header element-padding-x"
                        style="background-color: #215563; padding: 16px 20px; text-align: center;">
                        ${headerBrand}
                    </td>
                </tr>

                <tr>
                    <td class="body element-padding-x" style="padding: 0 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                        ${body}
                    </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                    <td class="footer"
                        style="padding: 10px 10px; text-align: center; color: white; font-size: 12px;">
                        <p>This email was sent to ${email} from My Ukoo</p>
                        <p>Copyright &copy; 2025 | MY UKOO | All Rights Reserved</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

</body>
</html>

`;
};
