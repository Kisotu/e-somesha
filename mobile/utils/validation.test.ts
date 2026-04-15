import { describe, expect, it } from "vitest";
import { validateLoginInput, validateRegisterInput } from "./validation";

describe("validateLoginInput", () => {
  it("rejects missing credentials", () => {
    expect(validateLoginInput("", "")).toBe("Email and password are required.");
  });

  it("rejects invalid email", () => {
    expect(validateLoginInput("bad-email", "Password1")).toBe("Enter a valid email address.");
  });

  it("accepts valid credentials", () => {
    expect(validateLoginInput("student@example.com", "Password1")).toBeNull();
  });
});

describe("validateRegisterInput", () => {
  it("rejects missing fields", () => {
    expect(validateRegisterInput("", "", "")).toBe("Name, email, and password are required.");
  });

  it("rejects short password", () => {
    expect(validateRegisterInput("Student", "student@example.com", "Short1")).toBe(
      "Password must be at least 8 characters.",
    );
  });

  it("rejects weak password composition", () => {
    expect(validateRegisterInput("Student", "student@example.com", "password1")).toBe(
      "Password must include uppercase, lowercase, and a number.",
    );
  });

  it("accepts strong input", () => {
    expect(validateRegisterInput("Student", "student@example.com", "StrongPass1")).toBeNull();
  });
});
