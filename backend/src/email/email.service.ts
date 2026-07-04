import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { Resend } from 'resend';
import { formatUsdFromBdt } from '../common/utils/currency';

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

	async sendPremiumPdfDeliveryEmail(
		to: string,
		name: string,
		bookTitle: string,
		pdfPath: string,
		attachmentFilename: string,
		orderRef: string,
	) {
		await this.resend.emails.send({
			from: this.senderEmail,
			to,
			subject: `Your licensed PDF delivery: ${bookTitle}`,
			html: `<h2>Thank you, ${name}!</h2>
				<p>Your payment for <strong>${bookTitle}</strong> is confirmed.</p>
				<p>The licensed PDF is attached to this email and is also available from your dashboard.</p>
				<p>Order reference: <strong>${orderRef}</strong></p>
				<p>Sign in to your dashboard to re-download it later: <a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/dashboard">Open dashboard</a></p>
				<p>— MultiHAT Academy</p>`,
			attachments: [{ filename: attachmentFilename, content: fs.readFileSync(pdfPath) }],
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

	async sendReferralRewardEmail(to: string, name: string, referredUserName: string, rewardBdt: number) {
		const rewardUsd = formatUsdFromBdt(rewardBdt);
		const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
		await this.resend.emails.send({
			from: this.senderEmail,
			to,
			subject: `🎉 Referral Reward Credited — MultiHAT Academy`,
			html: `<h2>You earned a referral reward, ${name}!</h2>
				<p>Your referred friend <strong>${referredUserName}</strong> has reached the spending threshold.</p>
				<p><strong>${rewardUsd}</strong> has been credited to your Wallet automatically.</p>
				<p><a href="${frontendUrl}/dashboard/referrals">View your referral dashboard</a></p>
				<p>Keep sharing and keep earning! — MultiHAT Academy</p>`,
		});
	}

	async sendShowcaseRewardEmail(to: string, name: string, platform: string, rewardBdt: number) {
		const rewardUsd = formatUsdFromBdt(rewardBdt);
		await this.resend.emails.send({
			from: this.senderEmail,
			to,
			subject: `💰 Showcase Reward Credited — MultiHAT Academy`,
			html: `<h2>Great news, ${name}!</h2>
				<p>Your <strong>${platform}</strong> showcase post has been verified and is still live after 10 days.</p>
				<p><strong>${rewardUsd}</strong> has been credited to your Wallet.</p>
				<p>Keep sharing your achievements! — MultiHAT Academy</p>`,
		});
	}
}
