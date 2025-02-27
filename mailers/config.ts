import nodemailer from "nodemailer";
import { config } from "dotenv";
import * as fs from "fs/promises";
import Handlebars from "handlebars";

config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.GMAILUSERNAME,
    pass: process.env.GMAILPASSWORD,
  },
});

export const sendMail = async ({
  templatePath,
  context,
  ...mailOptions
}: nodemailer.SendMailOptions & {
  templatePath: string;
  context: Record<string, unknown>;
}): Promise<void> => {
  let html: string | undefined;

  if (templatePath) {
    const template = await fs.readFile(templatePath, "utf-8");
    html = Handlebars.compile(template, {
      strict: true,
    })(context);
  }

  await transporter.sendMail({
    ...mailOptions,
    from: process.env.FROM,
    html: mailOptions.html ? mailOptions.html : html,
  });
};
