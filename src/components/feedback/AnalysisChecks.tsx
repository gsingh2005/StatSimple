import type { AnalysisCheck } from "../../types";
import { Badge, Card } from "../ui/Primitives";

const toneMap: Record<AnalysisCheck["status"], "neutral" | "warning" | "success" | "info"> = {
  pass: "success",
  warning: "warning",
  error: "warning",
  info: "info",
};

const iconMap: Record<AnalysisCheck["status"], string> = {
  pass: "✓",
  warning: "⚠",
  error: "✕",
  info: "i",
};

export const AnalysisChecksList = ({ checks }: { checks: AnalysisCheck[] }) => (
  <div className="checks-list">
    {checks.map((item) => (
      <Card key={item.id} className={`check-card check-card--${item.status}`}>
        <div className="check-card__header">
          <Badge tone={toneMap[item.status]}>
            {iconMap[item.status]} {item.title}
          </Badge>
        </div>
        <p>{item.description}</p>
      </Card>
    ))}
  </div>
);
