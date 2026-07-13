/**
 * Shared transaction payload shape.
 *
 * This shape is a CONTRACT across three folders: infra (API Gateway
 * passes the raw body through to SQS unmodified), lambda (validates and
 * scores exactly these fields), and frontend (this file). Per
 * CONTRIBUTING.md, any change here must land in the same PR as the
 * matching lambda/fraud_evaluator.py and infra/template.yaml changes.
 */
export interface TransactionPayload {
  transaction_id?: string;
  cardholder_name: string;
  amount: string;
  ip_address: string;
  country_code: string;
}

export interface AuditRecord extends TransactionPayload {
  transaction_id: string;
  risk_score: number;
  is_high_risk: boolean;
  reasons: string[];
  evaluated_at: number;
}

export type RiskLevel = "low" | "watch" | "high";

export function riskLevelFor(score: number): RiskLevel {
  if (score >= 50) return "high";
  if (score >= 25) return "watch";
  return "low";
}
