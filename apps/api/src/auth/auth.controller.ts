import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from "@nestjs/common";
import { OtpService } from "./otp.service";
import { Public } from "../common/decorators/index.js";
import { PrismaService } from "../prisma/prisma.service.js";

interface OtpSendDto {
  email: string;
}

interface OtpVerifyDto {
  email: string;
  otp: string;
}

interface OnboardDto {
  role: "creator" | "supporter";
  displayName?: string;
}

@Controller("auth")
@Public()
export class AuthController {
  constructor(private readonly otp: OtpService, private readonly prisma: any) {}

  @Get("status")
  status() {
    return this.otp.getStatus();
  }

  @Post("otp/send")
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: OtpSendDto) {
    const logger = new Logger("AuthController");
    if (!dto?.email || typeof dto.email !== "string") {
      return { ok: false, error: "Email is required" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
      return { ok: false, error: "Invalid email format" };
    }

    try {
      const result = await this.otp.sendOtp(dto.email);
      logger.log(
        `sendOtp result: ok=${result.ok} providerMessageId=${result.providerMessageId ?? "none"} error=${result.error ?? "none"}`,
      );
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
    } catch (e) {
      const err = e as Error;
      logger.error(`sendOtp threw for ${dto.email}: ${err.message}`);
      return {
        ok: false,
        error: `Email delivery failed: ${err.message}`,
        message: "Failed to send OTP — check server logs",
      };
    }
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: OtpVerifyDto) {
    const logger = new Logger("AuthController");
    if (!dto?.email || typeof dto.email !== "string") {
      return { ok: false, error: "Email is required" };
    }
    if (!dto?.otp || typeof dto.otp !== "string") {
      return { ok: false, error: "OTP is required" };
    }
    if (!/^\d{6}$/.test(dto.otp)) {
      return { ok: false, error: "OTP must be 6 digits" };
    }

    try {
      const result = await this.otp.verifyOtp(dto.email, dto.otp);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      logger.log(`verifyOtp ok: email=${dto.email} isNewUser=${(result as any).user ? false : true}`);
      return {
        ok: true,
        session: result.session,
        user: (result as any).user,
        isNewUser: !(result as any).user,
      };
    } catch (e) {
      const err = e as Error;
      logger.error(`verifyOtp threw for ${dto.email}: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Create or update a user record after OTP verification.
   * Called when a new user picks their role, OR when an existing
   * user updates their profile.
   *
   * Body: { role: "creator" | "supporter", displayName?: string }
   */
  @Post("onboard")
  @HttpCode(HttpStatus.OK)
  async onboard(@Body() dto: OnboardDto) {
    const logger = new Logger("AuthController");
    // We need the email from the request — but this is @Public() so we
    // accept it from the body too. For production we'd verify the JWT
    // and extract email from there.
    // For hackathon simplicity: pass email as a query param OR in body.
    const email = (dto as any).email?.toLowerCase();
    if (!email) return { ok: false, error: "email required (in body)" };
    if (!dto.role || !["creator", "supporter"].includes(dto.role)) {
      return { ok: false, error: "role must be 'creator' or 'supporter'" };
    }

    try {
      // 1. Find or create user
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        // New user — create with role
        const displayName =
          dto.displayName || email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);

        if (dto.role === "creator") {
          // Create a Creator record and link it
          const username = "u_" + email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) + Math.random().toString(36).slice(2, 6);
          const creator = await this.prisma.creator.create({
            data: {
              username,
              name: displayName,
              email,
              bio: "Joined NanoProof",
              walletAddress: "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
            },
          });
          user = await this.prisma.user.create({
            data: {
              email,
              role: "creator",
              displayName,
              creatorId: creator.id,
              lastLoginAt: new Date(),
            },
          });
          logger.log(`onboard: new creator ${email} → ${creator.username}`);
        } else {
          // Create a Supporter record and link it
          const walletAddress = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
          const supporter = await this.prisma.supporter.create({
            data: {
              address: walletAddress,
              label: displayName,
            },
          });
          user = await this.prisma.user.create({
            data: {
              email,
              role: "supporter",
              displayName,
              supporterId: supporter.id,
              walletAddress,
              lastLoginAt: new Date(),
            },
          });
          logger.log(`onboard: new supporter ${email} → ${walletAddress.slice(0,10)}...`);
        }
      } else {
        // Existing user — update role if provided, refresh lastLoginAt
        const updateData: any = { lastLoginAt: new Date() };
        if (dto.role && dto.role !== user.role) {
          updateData.role = dto.role;
        }
        if (dto.displayName) {
          updateData.displayName = dto.displayName;
        }
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
        logger.log(`onboard: existing user ${email} updated`);
      }

      return { ok: true, user };
    } catch (e) {
      const err = e as Error;
      logger.error(`onboard failed for ${email}: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Get current user profile by email (used by web dashboards).
   * Body: { email: string }
   */
  @Post("me")
  @HttpCode(HttpStatus.OK)
  async me(@Body() body: { email: string }) {
    if (!body?.email) return { ok: false, error: "email required" };
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
      });
      if (!user) return { ok: false, error: "User not found" };
      return { ok: true, user };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
}
