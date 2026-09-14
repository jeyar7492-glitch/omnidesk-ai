export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}

export interface IEmailProvider {
  sendEmail(options: EmailOptions): Promise<EmailSendResult>;
  isConfigured(): boolean;
}
