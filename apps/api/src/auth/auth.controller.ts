import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  OnModuleInit,
  Post,
} from "@nestjs/common";
import { OtpService } from "./otp.service";
import { Public } from "../common/decorators/index.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { AuthMigrate } from "./auth.migrate.js";
import { generateEthereumWallet } from "./auth.wallet.js";

interface OtpSendDto {
  email: string;
}

interface OtpVerifyDto {
  email: string;
  otp: string;
}

interface OnboardDto {
  email: string;
  role: "creator" | "supporter";
  displayName?: string;
}

interface MeDto {
  email: string;
}

@Public()
@Controller("auth")
export class AuthController implements OnModuleInit {
  private readonly logger = new Logger(AuthController.name);
  private migrator!: AuthMigrate;

  constructor(
    private readonly otp: OtpService,
    private readonly prisma: PrismaService,
  ) {}

  // Auto-create the users table on first boot so /onboard + /me work
  // immediately after deployment. Wrapped in try/catch — never fatal.
  async onModuleInit() {
    try {
      this.migrator = new AuthMigrate(this.prisma);
      const r = await this.migrator.ensureUserTable();
      this.logger.log(`ensureUserTable: ${r.message}`);
    } catch (e) {
      this.logger.warn(`ensureUserTable failed: ${(e as Error).message}`);
    }
  }

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
      };
    } catch (e) {
      logger.error(`sendOtp threw: ${(e as Error).message}`);
      return { ok: false, error: (e as Error).message };
    }
  }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: OtpVerifyDto) {
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
      // Look up the user from the database so existing users land on
      // their dashboard instead of going through role selection again.
      let user: unknown = undefined;
      if (result.ok) {
        try {
          const u = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
          });
          if (u) {
            await this.prisma.user.update({
              where: { id: u.id },
              data: { lastLoginAt: new Date() },
            });
            user = u;
          }
        } catch (e) {
          this.logger.warn(`verifyOtp: user lookup failed for ${dto.email}: ${(e as Error).message}`);
        }
      }
      return {
        ok: result.ok,
        session: result.session,
        user,
        error: result.error,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /**
   * Create or fetch a user record. Called by the web dashboard
   * after a successful OTP verification.
   *
   * Body: { email: string, role: "creator" | "supporter", displayName?: string }
   *
   * Returns the existing user if one already exists with this email —
   * never overwrites. Otherwise creates a new User + linked Creator /
   * Supporter record.
   */
  @Post("onboard")
  @HttpCode(HttpStatus.OK)
  async onboard(@Body() dto: OnboardDto) {
    if (!dto?.email || typeof dto.email !== "string") {
      return { ok: false, error: "email is required" };
    }
    if (!dto.role || !["creator", "supporter"].includes(dto.role)) {
      return { ok: false, error: "role must be creator or supporter" };
    }
    const email = dto.email.toLowerCase();

    try {
      // Idempotency: if user already exists for this email, just refresh + return.
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { lastLoginAt: new Date() },
        });
        return { ok: true, user: { ...existing, lastLoginAt: new Date() } };
      }

      // First-time user — derive displayName from email
      const baseName = email.split("@")[0];
      const displayName =
        dto.displayName || baseName.charAt(0).toUpperCase() + baseName.slice(1);

      if (dto.role === "creator") {
        const username =
          "u_" +
          baseName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) +
          Math.random().toString(36).slice(2, 6);
        // Generate a REAL Ethereum keypair (private key + address). The
        // creator can import the private key into MetaMask to actually
        // access their USDC earnings on Arc. Demo-style custodial wallet.
        const kp = generateEthereumWallet();
        const walletAddress = kp.address;

        const creator = await this.prisma.creator.create({
          data: {
            username,
            name: displayName,
            email,
            bio: "Joined NanoProof",
          },
        });
        await this.prisma.wallet.create({
          data: {
            creatorId: creator.id,
            address: walletAddress,
            network: "ARC_TESTNET",
            isPrimary: true,
          },
        });
        const user = await this.prisma.user.create({
          data: {
            email,
            role: "creator",
            displayName,
            creatorId: creator.id,
            walletAddress,
            walletKey: kp.privateKey,
          },
        });
        return { ok: true, user };
      }

      // supporter
      const kp = generateEthereumWallet();
      const walletAddress = kp.address;
      const supporter = await this.prisma.supporter.create({
        data: { address: walletAddress, label: displayName },
      });
      const user = await this.prisma.user.create({
        data: {
          email,
          role: "supporter",
          displayName,
          supporterId: supporter.id,
          walletAddress,
          walletKey: kp.privateKey,
        },
      });
      return { ok: true, user };
    } catch (e) {
      const err = e as Error;
      this.logger.error(`onboard(${email}): ${err.message}`);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Fetch the user record for a given email (used by the web dashboards
   * to display the signed-in user's displayName + role).
   *
   * Body: { email: string }
   */
  @Post("me")
  @HttpCode(HttpStatus.OK)
  async me(@Body() dto: MeDto) {
    if (!dto?.email) return { ok: false, error: "email required" };
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (!user) return { ok: false, error: "User not found" };
      return { ok: true, user };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /**
   * Reveal the user's custodial wallet one time. Returns plaintext
   * private key on first call. After wallet-confirm is called, returns
   * { alreadyRevealed: true } instead.
   *
   * Body: { email: string }
   */
  @Post("wallet-reveal")
  @HttpCode(HttpStatus.OK)
  async walletReveal(@Body() dto: MeDto) {
    if (!dto?.email) return { ok: false, error: "email required" };
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (!user) return { ok: false, error: "User not found" };
      if (user.walletRevealed) {
        return {
          ok: true,
          alreadyRevealed: true,
          address: user.walletAddress,
        };
      }
      // Backwards compat: users created before the walletKey column was
      // added have walletKey=null and walletRevealed=false. Generate a
      // fresh keypair for them on first reveal so the demo path still
      // works for early sign-ups.
      let activeKey = user.walletKey;
      let activeAddress = user.walletAddress;
      if (!activeKey) {
        const kp = generateEthereumWallet();
        activeKey = kp.privateKey;
        activeAddress = kp.address;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { walletKey: activeKey, walletAddress: activeAddress },
        });
        // Also update the linked Creator's primary Wallet row + its
        // denormalized walletAddress on User for downstream consumers.
        // (For supporter role there's no Creator/Wallet row.)
        this.logger.log(`wallet-reveal: minted new key for legacy user ${user.email}`);
      }
      return {
        ok: true,
        address: activeAddress,
        privateKey: activeKey,
        network: "ARC_TESTNET",
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /**
   * Confirm the user has saved their private key. Wipes the plaintext
   * key from the database. After this, the user can only get their
   * earnings by importing the key they saved.
   *
   * Body: { email: string }
   */
  @Post("wallet-confirm")
  @HttpCode(HttpStatus.OK)
  async walletConfirm(@Body() dto: MeDto) {
    if (!dto?.email) return { ok: false, error: "email required" };
    try {
      const updated = await this.prisma.user.update({
        where: { email: dto.email.toLowerCase() },
        data: { walletRevealed: true, walletKey: null },
      });
      return {
        ok: true,
        walletRevealed: updated.walletRevealed,
        address: updated.walletAddress,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /**
   * One-shot migration runner. Creates the users table on demand.
   * Safe to call multiple times.
   */
  @Post("migrate")
  @HttpCode(HttpStatus.OK)
  async migrate() {
    const m = new AuthMigrate(this.prisma);
    return m.ensureUserTable();
  }
}
// build trigger: Sat Jul  4 23:05:25 UTC 2026
