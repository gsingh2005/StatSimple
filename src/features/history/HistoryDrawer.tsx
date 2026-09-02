import type { AnalysisHistoryEntry, Dataset } from "../../types";
import { describeHistoryStaleness } from "../analyze/runAnalysis";
import { Badge, Button, Card } from "../../components/ui/Primitives";
import { formatDateTime } from "../../utils/format";

export const HistoryDrawer = ({
  open,
  entries,
  currentDataset,
  onClose,
  onReopen,
}: {
  open: boolean;
  entries: AnalysisHistoryEntry[];
  currentDataset: Dataset | null;
  onClose: () => void;
  onReopen: (entry: AnalysisHistoryEntry) => void;
}) => (
  <aside className={open ? "history-drawer history-drawer--open" : "history-drawer"} aria-hidden={!open}>
    <div className="history-drawer__header">
      <div>
        <div className="section-header__eyebrow">History</div>
        <h2>Recent analyses</h2>
      </div>
      <Button size="sm" variant="ghost" onClick={onClose}>
        Close
      </Button>
    </div>

    {entries.length === 0 ? (
      <Card>
        <p>No analyses have been run yet.</p>
      </Card>
    ) : (
      <div className="history-drawer__list">
        {entries.map((entry) => {
          const staleMessage = describeHistoryStaleness(currentDataset, entry);

          return (
            <Card key={entry.id}>
              <div className="history-card__header">
                <Badge tone={staleMessage ? "warning" : "info"}>{entry.analysisType}</Badge>
                <span>{formatDateTime(entry.timestamp)}</span>
              </div>
              <h3>{entry.title}</h3>
              <p>{entry.headline}</p>
              {staleMessage ? <p className="subtle-copy">{staleMessage}</p> : null}
              <Button size="sm" variant="ghost" onClick={() => onReopen(entry)}>
                Reopen
              </Button>
            </Card>
          );
        })}
      </div>
    )}
  </aside>
);
