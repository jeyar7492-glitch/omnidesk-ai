import React, { useState } from "react";
import { Shield, Lock, Mail, User, Building, AlertCircle, ArrowRight, CheckCircle } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";

export const LoginView: React.FC = () => {
  const { login, register } = useWorkspace();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error("First name and last name are required");
        }
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        await register({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          organizationName: organizationName.trim() || undefined,
        });
      } else {
        if (!email.trim() || !password) {
          throw new Error("Please enter your email and password");
        }
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary)",
        backgroundImage: "radial-gradient(ellipse at 50% 15%, rgba(6, 182, 212, 0.08), transparent 60%)",
        padding: "24px",
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "440px",
          borderRadius: "16px",
          padding: "36px 32px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(6,182,212,0.1)",
          border: "1px solid var(--border-medium)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(99, 102, 241, 0.2))",
              border: "1px solid rgba(6, 182, 212, 0.4)",
              marginBottom: "16px",
              boxShadow: "0 0 20px rgba(6, 182, 212, 0.25)",
            }}
          >
            <Shield size={28} color="var(--brand-cyan)" />
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            OmniDesk AI
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              marginTop: "6px",
              marginBottom: 0,
            }}
          >
            Enterprise Autonomous AI Workspace
          </p>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
            backgroundColor: "var(--bg-secondary)",
            padding: "4px",
            borderRadius: "10px",
            border: "1px solid var(--border-subtle)",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: !isRegisterMode ? "var(--bg-elevated)" : "transparent",
              color: !isRegisterMode ? "var(--brand-cyan)" : "var(--text-secondary)",
              boxShadow: !isRegisterMode ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: isRegisterMode ? "var(--bg-elevated)" : "transparent",
              color: isRegisterMode ? "var(--brand-cyan)" : "var(--text-secondary)",
              boxShadow: isRegisterMode ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="animate-fade-in"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px 14px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "10px",
              marginBottom: "20px",
              color: "#fca5a5",
              fontSize: "13px",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          {isRegisterMode && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                  }}
                >
                  First Name
                </label>
                <div style={{ position: "relative" }}>
                  <User
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 36px",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                  }}
                >
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Vance"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "500",
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              Work Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@omnidesk.ai"
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: isRegisterMode ? "16px" : "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "500",
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegisterMode ? "Min 8 characters" : "••••••••"}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {isRegisterMode && (
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Workspace / Organization (Optional)
              </label>
              <div style={{ position: "relative" }}>
                <Building
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Acme Autonomous Systems"
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 36px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "var(--brand-cyan)",
              color: "#04141e",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(6, 182, 212, 0.35)",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : isRegisterMode ? (
              <>
                <span>Create Enterprise Account</span>
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security Assurance Badge */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          <CheckCircle size={14} color="var(--status-online)" />
          <span>Server-Authoritative RBAC & Multi-Tenant Isolation</span>
        </div>
      </div>
    </div>
  );
};
