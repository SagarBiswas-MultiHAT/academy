import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
	private resend: Resend;
	private senderEmail: string;

	constructor(private configService: ConfigService) {
		this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
		this.senderEmail = this.configService.get<string>('SENDER_EMAIL', 'academy@multihat.dev');
	}

	async sendPurchaseReceipt(to: string, name: string, bookTitle: string) {
		await this.resend.emails.send({
			from: this.senderEmail,
			to,
			subject: `Your purchase: ${bookTitle} — MultiHAT Academy`,
			html: `<h2>Thank you, ${name}!</h2>
				<p>Your purchase of <strong>${bookTitle}</strong> is confirmed.</p>
				<p>Your watermarked PDF will be delivered to this email shortly.</p>
				<p>— MultiHAT Academy</p>`,
		});
	}

	async sendCertificateEmail(to: string, name: string, courseTitle: string, certId: string, pdfBuffer?: Buffer) {
		const attachments = pdfBuffer
			? [{ filename: `certificate-${certId}.pdf`, content: pdfBuffer }]
			: [];

		await this.resend.emails.send({
			from: this.senderEmail,
			to,
			subject: `🎓 Certificate Earned: ${courseTitle}`,
			html: `<h2>Congratulations, ${name}!</h2>
				<p>You've earned a certificate for <strong>${courseTitle}</strong>.</p>
				<p>Verification URL: <a href="https://academy.multihat.dev/verify/${certId}">Verify Certificate</a></p>`,
			attachments,
		});
	}

	async sendShowcaseRewardEmail(to: string, name: string, platform: string, rewardBdt: number) {
		await this.resend.emails.send({
			from: this.senderEmail,
			to,
			subject: `💰 Showcase Reward Credited — MultiHAT Academy`,
			html: `<h2>Great news, ${name}!</h2>
				<p>Your <strong>${platform}</strong> showcase post has been verified and is still live after 10 days.</p>
				<p><strong>৳${rewardBdt}</strong> has been credited to your Wallet.</p>
				<p>Keep sharing your achievements! — MultiHAT Academy</p>`,
		});
	}
}
