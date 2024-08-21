import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "a71899af5ab622",
          pass: "6fc90e1362b7ad",
        },
      });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: options.text,
    html: `<a href=${options.message}> ${options.message} </a> `
  };

  await transporter.sendMail(mailOptions);

  transporter.verify((error, success) => {
    if (error) {
      console.error("SMTP Verification Error:", error);
    } else {
      console.log("SMTP Server is ready to take messages");
    }
  });
  
};


