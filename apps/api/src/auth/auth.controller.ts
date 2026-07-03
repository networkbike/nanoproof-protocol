import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { OtpService } from "./otp.service";
import { Public } from "../common/decorators/index.js";

interface OtpSendDto {
  email: string;
}

interface OtpVerifyDto {
  email: string;
  otp: string;
}

@Public()
@Controller("auth")
export class AuthController {
  constructor(private readonly otp: OtpService) {}

  /**
   * Public auth status — tells clients whether a real email provider is configured.
   * Used by the sign-in page to show a friendly "demo mode" banner.
   */
  @Get("status")
  status() {
    return this.otp.getStatus();
  }

  /**
   * Send an OTP to the given email.
   * In demo mode, returns the code in devOtp so judges can sign in without a real provider.
   * In production, returns ok: true and the email is dispatched to the configured provider.
   */
  @Post("otp/send")
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: OtpSendDto) {
    if (!dto?.email || typeof dto.email !== "string") {
      return { ok: false, error: "Email is required" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
      return { ok: false, error: "Invalid email format" };
    }

    const result = await this.otp.sendOtp(dto.email);
    return {
      ok: result.ok,
      ttl: result.ttl,
      message: result.ok
        ? `OTP sent to ${dto.email}. It expires in ${Math.floor(result.ttl / 60)} minutes.`
        : "Failed to send OTP",
      devOtp: result.devOtp,
      providerMessageId: result.providerMessageId,
      error: result.error,
    };
  }

  /**
   * Verify the OTP and issue a session token.
   */
  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: OtpVerifyDto) {
    if (!dto?.email || !dto?.otp) {
      return { ok: false, error: "Email and OTP are required" };
    }
    if (!/^\d{6}$/.test(dto.otp)) {
      return { ok: false, error: "OTP must be 6 digits" };
    }

    const result = await this.otp.verifyOtp(dto.email, dto.otp);
    return {
      ok: result.ok,
      session: result.session,
      error: result.error,
    };
  }
}