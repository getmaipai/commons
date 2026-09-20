// A setting's resolved runtime value at some scope (household, person,
// or device) - the wire shape GET /api/settings and the settings write
// routes carry. Hand-typed here, the same provisional posture
// widgets.ts's WidgetDescriptor takes, until @maipai/spec grows a real
// generated shape for it (today it only declares the KEY, SettingsKey).
export interface ResolvedSetting {
  key: string;
  value: unknown;
  source: "user" | "default" | "package" | "sync";
  label: string;
  help?: string;
  level: "basic" | "advanced" | "expert";
  secret: boolean;
  /** Only meaningful when secret is true: whether a real value has been
   * stored, without ever revealing it. */
  isSet?: boolean;
}
