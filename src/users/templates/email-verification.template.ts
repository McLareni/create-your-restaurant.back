export const getEmailVerificationTemplate = (
  title: string,
  loginCode: string,
): string => `
  <div style="background-color: #F4F1EC; padding: 0; margin: 0; font-family: sans-serif; text-align: center; width: 100%;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <tr>
        <td align="center">
          <div style="background-color: #110F0E; border-radius: 28px; padding: 48px 40px; text-align: center;">
            <h3 style="color: #FFFFFF;">${title}</h3>
            <div style="background: #1C1917; border-radius: 20px; padding: 24px 20px; margin-bottom: 28px;">
              <div style="font-size: 42px; font-weight: 800; color: #00FF88; letter-spacing: 10px;">
                ${loginCode}
              </div>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
`;
