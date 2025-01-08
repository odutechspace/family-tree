export const baseTemplate = (body: string, email: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Chama Smart</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
          rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet">
    <style>
        .content {display: block !important; padding: 10px !important;}
        .btn{background-color: #00A85C;padding: 10px 20px;border-radius: 12px; color: white; font-weight: 600; border: none; cursor: pointer;}
        .element-padding-x{padding-left: 20px !important; padding-right: 20px !important }
        @media screen and (max-width: 600px) {
            .content {width: 100% !important;display: block !important;padding: 10px !important;}
            /*.header, .body, .footer {padding: 20px !important;}*/
            .element-padding-x{padding-left: 10px !important; padding-right: 10px !important }
        }
         .footer{ background-color: #203D3B;}
         @media (prefers-color-scheme: dark) {
          .no-dark-mode {
            background-color: #203D3B !important; /* Re-define to ensure no change */
            color: white !important;
          }
          .footer{
            background-color: #203D3B;
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
                        style="display: flex; background-color: #BF8F73; flex-direction: column; align-items: center; padding: 0 10px 0 0; text-align: center; color: #00A85C; font-size: 24px; ">
                        <img width="200px" style=" padding: 8px 2px; border-radius: 6px;"  src="https://chama-smart.web.app/assets/images/logo-mail.png" alt="Logo"/>
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
}
