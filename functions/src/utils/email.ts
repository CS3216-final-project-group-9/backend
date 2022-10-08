import {db} from "../firebase";
import { FirestoreMail } from "../type/firebase-type";
import { Post } from "../type/post";
import { AppliedRequest } from "../type/postApplication";
import { User } from "../type/user";
import { getAuth } from 'firebase-admin/auth';
import momentTimezone = require("moment-timezone");
 

export function notifyPosterPostCreated(post: Post) {
  const subject = 'Your study post is now live!';
  const title = 'Your study post is now live!';
  const message = 'You will receive emails when others apply to study with you. Simply accept them and telegram details will be shared!';
  return sendEmailToUser(post.poster, subject, title, message);
}

export function notifyApplicantSessionApplied(post: Post, participant: User) {
  const poster = post.poster.name;
  const subject = 'Your application to study with has been received!';
  const title = `Your application to study with ${poster} has been received!`
  const message = `${poster} has been notified. Once ${poster} has accepted your application, you will be notified and telegram details will be shared with you!`;
  return sendEmailToUser(participant, subject, title, message); 
}

export function notifyPosterHasNewApplicant(post: Post) {
  const subject = 'New Applicant for your post!';
  const title = 'You have a new applicant for your study post!';
  const message = 'Log in to BuddyNUS to accept them!';
  return sendEmailToUser(post.poster, subject, title, message);
}

export function notifyParticipantHostAccepted(post: Post, participant: User) {
  const postDate = momentTimezone(post.startDateTime).format('MMM D');
  const postLocation = post.location;
  const poster = post.poster.name;
  const subject = 'Your study session is confirmed!';
  const title = ``
  const message = `Your study session with ${poster} scheduled for ${postDate} at ${postLocation} has been confirmed! Log in to BuddyNUS for more details`;
  return sendEmailToUser(participant, subject, title, message);
}


export function notifyPosterApplicantCancelled(applicant: AppliedRequest) {
  const post = applicant.post;
  const postDate = momentTimezone(post.startDateTime).format('MMM D');
  const postLocation = post.location;
  const subject = 'Applicant has cancelled!';
  const title = `An applicant has cancelled!`
  const message = `An applicant has cancelled a study session with you scheduled for ${postDate} at ${postLocation}`;
  return sendEmailToUser(post.poster, subject, title, message);
}

export function notifyParticipantHostCancelled(post: Post, participant: User) {
  const postDate = momentTimezone(post.startDateTime).format('MMM D');
  const postLocation = post.location;
  const subject = 'Study session cancelled!';
  const title = `Your study session cancelled!`
  const message = `Your upcoming study session, scheduled for ${postDate} at ${postLocation} has been cancelled by the creator of the post`;
  return sendEmailToUser(participant, subject, title, message);
}

export function notifyParticipantsHostCancelled(post: Post) {
  const postDate = momentTimezone(post.startDateTime).format('MMM D');
  const users = post.participants;
  const postLocation = post.location;
  const promises = [];
  for (const user of users) {
    const subject = 'Study session cancelled!';
    const title = `Your study session cancelled!`
    const message = `Your upcoming study session, scheduled for ${postDate} at ${postLocation} has been cancelled by the creator of the post`;
    promises.push(sendEmailToUser(user, subject, title, message));
  }
  return Promise.all(promises);
}

/**
 * @param username Username of recipient
 * @param message Message to be sent to recipient
 * @returns An email template
 */
function getEmailTemplate(username: string, title: string, message: string) {
return `
<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<!--[if gte mso 9]>
<xml>
  <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
  <title></title>
  
    <style type="text/css">
      @media only screen and (min-width: 520px) {
  .u-row {
    width: 500px !important;
  }
  .u-row .u-col {
    vertical-align: top;
  }

  .u-row .u-col-100 {
    width: 500px !important;
  }

}

@media (max-width: 520px) {
  .u-row-container {
    max-width: 100% !important;
    padding-left: 0px !important;
    padding-right: 0px !important;
  }
  .u-row .u-col {
    min-width: 320px !important;
    max-width: 100% !important;
    display: block !important;
  }
  .u-row {
    width: calc(100% - 40px) !important;
  }
  .u-col {
    width: 100% !important;
  }
  .u-col > div {
    margin: 0 auto;
  }
}
body {
  margin: 0;
  padding: 0;
}

table,
tr,
td {
  vertical-align: top;
  border-collapse: collapse;
}

p {
  margin: 0;
}

.ie-container table,
.mso-container table {
  table-layout: fixed;
}

* {
  line-height: inherit;
}

a[x-apple-data-detectors='true'] {
  color: inherit !important;
  text-decoration: none !important;
}

table, td { color: #000000; } </style>
  
  

</head>

<body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #e7e7e7;color: #000000">
  <!--[if IE]><div class="ie-container"><![endif]-->
  <!--[if mso]><div class="mso-container"><![endif]-->
  <table style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #e7e7e7;width:100%" cellpadding="0" cellspacing="0">
  <tbody>
  <tr style="vertical-align: top">
    <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
    <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: #e7e7e7;"><![endif]-->
    

<div class="u-row-container" style="padding: 0px;background-color: transparent">
  <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
    <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
      <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:500px;"><tr style="background-color: transparent;"><![endif]-->
      
<!--[if (mso)|(IE)]><td align="center" width="500" style="width: 500px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
<div class="u-col u-col-100" style="max-width: 320px;min-width: 500px;display: table-cell;vertical-align: top;">
  <div style="height: 100%;width: 100% !important;">
  <!--[if (!mso)&(!IE)]><!--><div style="height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
  
<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
        
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding-right: 0px;padding-left: 0px;" align="center">
      
      <img align="center" border="0" src="https://firebasestorage.googleapis.com/v0/b/cs3216-final-group-9.appspot.com/o/logo.png?alt=media&token=20d6f6f8-48a8-4bb0-b33a-aa38ddd2716f" alt="" title="" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 100%;max-width: 480px;" width="480"/>
      
    </td>
  </tr>
</table>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <table height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 1px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
    <tbody>
      <tr style="vertical-align: top">
        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
          <span>&#160;</span>
        </td>
      </tr>
    </tbody>
  </table>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <h1 style="margin: 0px; line-height: 140%; text-align: left; word-wrap: break-word; font-weight: normal; font-family: arial,helvetica,sans-serif; font-size: 22px;">
    <div>${title}</div>
  </h1>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <div style="line-height: 140%; text-align: left; word-wrap: break-word;">
    <p style="font-size: 14px; line-height: 140%;">Hi ${username}, </p>
<p style="font-size: 14px; line-height: 140%;"> </p>
<p style="font-size: 14px; line-height: 140%;">${message}</p>
  </div>

      </td>
    </tr>
  </tbody>
</table>

  <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
  </div>
</div>
<!--[if (mso)|(IE)]></td><![endif]-->
      <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
    </div>
  </div>
</div>


    <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
    </td>
  </tr>
  </tbody>
  </table>
  <!--[if mso]></div><![endif]-->
  <!--[if IE]></div><![endif]-->
</body>

</html>
`;
}




function sendEmail(username: string, email: string, subject: string, title: string, message: string) {
  const emailHtml = getEmailTemplate(username, title, message);
  const mail: FirestoreMail = {
    message: {
      subject: subject,
      text: '',
      html: emailHtml,
    },
    to: email,
  }
  return db.mail.doc().create(mail);
}

function sendEmailToUser(user: User,subject: string, title: string, message: string) {
  return getAuth().getUser(user.id).then((userRecord) => {
   if (!userRecord.email) {
     return Promise.reject('Email not found');
   }
   const email = userRecord.email;
   return sendEmail(user.name, email, subject, title, message);
   })
 }
 
