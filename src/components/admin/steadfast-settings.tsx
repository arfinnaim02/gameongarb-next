"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Save,
  ShieldCheck,
  Truck,
} from "lucide-react";

type SettingsState = {
  configured:
    boolean;

  enabled:
    boolean;

  provider:
    string;

  baseUrl:
    string;

  maskedApiKey:
    string |
    null;

  maskedSecretKey:
    string |
    null;

  updatedAt:
    string |
    null;
};

const DEFAULT_BASE_URL =
  "https://portal.packzy.com/api/v1";

export function SteadfastSettings() {
  const [
    settings,
    setSettings,
  ] =
    useState<
      SettingsState |
      null
    >(
      null,
    );

  const [
    enabled,
    setEnabled,
  ] =
    useState(
      false,
    );

  const [
    baseUrl,
    setBaseUrl,
  ] =
    useState(
      DEFAULT_BASE_URL,
    );

  const [
    apiKey,
    setApiKey,
  ] =
    useState(
      "",
    );

  const [
    secretKey,
    setSecretKey,
  ] =
    useState(
      "",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
    );

  const [
    testing,
    setTesting,
  ] =
    useState(
      false,
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      "",
    );

  const [
    error,
    setError,
  ] =
    useState(
      "",
    );

  useEffect(() => {
    let cancelled =
      false;

    void fetch(
      "/api/admin/integrations/steadfast",
      {
        cache:
          "no-store",
      },
    )
      .then(
        async (
          response,
        ) => {
          const result =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              result.error ??
                "Unable to load Steadfast settings.",
            );
          }

          return result as SettingsState;
        },
      )
      .then(
        (
          result,
        ) => {
          if (
            cancelled
          ) {
            return;
          }

          setSettings(
            result,
          );

          setEnabled(
            result.enabled,
          );

          setBaseUrl(
            result.baseUrl ||
              DEFAULT_BASE_URL,
          );
        },
      )
      .catch(
        (
          caught,
        ) => {
          if (
            cancelled
          ) {
            return;
          }

          setError(
            caught instanceof
              Error
              ? caught.message
              : "Unable to load Steadfast settings.",
          );
        },
      )
      .finally(
        () => {
          if (
            !cancelled
          ) {
            setLoading(
              false,
            );
          }
        },
      );

    return () => {
      cancelled =
        true;
    };
  }, []);

  async function reload() {
    setLoading(
      true,
    );

    setError(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/admin/integrations/steadfast",
          {
            cache:
              "no-store",
          },
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to reload settings.",
        );
      }

      setSettings(
        result,
      );

      setEnabled(
        result.enabled,
      );

      setBaseUrl(
        result.baseUrl ||
          DEFAULT_BASE_URL,
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to reload settings.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  async function save() {
    setSaving(
      true,
    );

    setMessage(
      "",
    );

    setError(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/admin/integrations/steadfast",
          {
            method:
              "PUT",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                enabled,
                baseUrl,
                apiKey:
                  apiKey.trim() ||
                  undefined,

                secretKey:
                  secretKey.trim() ||
                  undefined,
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to save Steadfast settings.",
        );
      }

      setApiKey(
        "",
      );

      setSecretKey(
        "",
      );

      setMessage(
        result.message ??
          "Steadfast settings saved.",
      );

      await reload();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to save Steadfast settings.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function testConnection() {
    setTesting(
      true,
    );

    setMessage(
      "",
    );

    setError(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/admin/integrations/steadfast",
          {
            method:
              "POST",
          },
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Connection test failed.",
        );
      }

      const balance =
        typeof result.balance ===
        "number"
          ? ` Current balance: ৳${result.balance.toLocaleString(
              "en-BD",
            )}.`
          : "";

      setMessage(
        `${
          result.message ??
          "Connection successful."
        }${balance}`,
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Connection test failed.",
      );
    } finally {
      setTesting(
        false,
      );
    }
  }

  return (
    <section
      className="card"
      style={{
        padding:
          22,

        marginTop:
          20,
      }}
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "flex-start",

          justifyContent:
            "space-between",

          gap:
            16,

          flexWrap:
            "wrap",
        }}
      >
        <div
          style={{
            display:
              "flex",

            gap:
              12,
          }}
        >
          <div
            style={{
              width:
                42,

              height:
                42,

              display:
                "grid",

              placeItems:
                "center",

              borderRadius:
                10,

              background:
                "#fff3e9",

              color:
                "var(--orange)",
            }}
          >
            <Truck
              size={
                20
              }
            />
          </div>

          <div>
            <h3
              style={{
                margin:
                  0,
              }}
            >
              Steadfast Courier
            </h3>

            <p
              className="muted"
              style={{
                margin:
                  "5px 0 0",
              }}
            >
              Connect your
              Steadfast /
              Packzy account
              securely.
            </p>
          </div>
        </div>

        <span
          className={`badge ${
            settings
              ?.enabled
              ? "green"
              : "orange"
          }`}
        >
          {settings
            ?.enabled
            ? "Enabled"
            : settings
                  ?.configured
              ? "Configured"
              : "Not Configured"}
        </span>
      </div>

      {loading ? (
        <p
          className="muted"
          style={{
            marginTop:
              18,
          }}
        >
          Loading
          Steadfast
          settings...
        </p>
      ) : (
        <>
          <div
            style={{
              display:
                "grid",

              gap:
                14,

              marginTop:
                20,
            }}
          >
            <label>
              <span className="label">
                API Base URL
              </span>

              <input
                className="field"
                type="url"
                value={
                  baseUrl
                }
                onChange={(
                  event,
                ) =>
                  setBaseUrl(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",

                gap:
                  12,
              }}
            >
              <label>
                <span className="label">
                  API Key
                </span>

                <input
                  className="field"
                  type="password"
                  autoComplete="new-password"
                  value={
                    apiKey
                  }
                  onChange={(
                    event,
                  ) =>
                    setApiKey(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    settings
                      ?.maskedApiKey ??
                    "Enter API key"
                  }
                />
              </label>

              <label>
                <span className="label">
                  Secret Key
                </span>

                <input
                  className="field"
                  type="password"
                  autoComplete="new-password"
                  value={
                    secretKey
                  }
                  onChange={(
                    event,
                  ) =>
                    setSecretKey(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    settings
                      ?.maskedSecretKey ??
                    "Enter secret key"
                  }
                />
              </label>
            </div>

            {settings
              ?.configured ? (
              <div
                style={{
                  display:
                    "flex",

                  gap:
                    8,

                  alignItems:
                    "center",

                  padding:
                    12,

                  border:
                    "1px solid #d9eadc",

                  borderRadius:
                    8,

                  background:
                    "#f5fbf6",

                  color:
                    "#176b32",
                }}
              >
                <ShieldCheck
                  size={
                    17
                  }
                />

                Credentials
                are stored
                encrypted.
              </div>
            ) : null}

            <label
              style={{
                display:
                  "flex",

                gap:
                  9,

                alignItems:
                  "center",
              }}
            >
              <input
                type="checkbox"
                checked={
                  enabled
                }
                onChange={(
                  event,
                ) =>
                  setEnabled(
                    event.target
                      .checked,
                  )
                }
              />

              Enable
              Steadfast
              courier
              integration
            </label>

            <small
              className="muted"
            >
              Leave the key
              fields empty when
              saving if you want
              to keep the
              currently stored
              credentials.
            </small>
          </div>

          {message ? (
            <div
              style={{
                marginTop:
                  15,

                padding:
                  11,

                borderRadius:
                  8,

                background:
                  "#effaf2",

                color:
                  "#176b32",

                fontSize:
                  12,
              }}
            >
              <CheckCircle2
                size={
                  15
                }
                style={{
                  verticalAlign:
                    "middle",

                  marginRight:
                    6,
                }}
              />

              {message}
            </div>
          ) : null}

          {error ? (
            <div
              style={{
                marginTop:
                  15,

                padding:
                  11,

                borderRadius:
                  8,

                background:
                  "#fff0ef",

                color:
                  "#a1261d",

                fontSize:
                  12,
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              display:
                "flex",

              gap:
                8,

              flexWrap:
                "wrap",

              marginTop:
                18,
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                saving
              }
              onClick={() =>
                void save()
              }
            >
              <Save
                size={
                  15
                }
              />

              {saving
                ? "Saving..."
                : "Save Steadfast"}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              disabled={
                testing ||
                !settings
                  ?.configured ||
                !settings
                  ?.enabled
              }
              onClick={() =>
                void testConnection()
              }
            >
              <KeyRound
                size={
                  15
                }
              />

              {testing
                ? "Testing..."
                : "Test Connection"}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              disabled={
                loading
              }
              onClick={() =>
                void reload()
              }
            >
              <RefreshCw
                size={
                  15
                }
              />

              Refresh
            </button>
          </div>
        </>
      )}
    </section>
  );
}