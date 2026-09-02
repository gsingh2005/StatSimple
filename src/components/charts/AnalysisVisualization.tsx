import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { VisualizationModel } from "../../types";
import { Card } from "../ui/Primitives";

const ChartFrame = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <Card className="chart-card">
    <h3>{title}</h3>
    <div className="chart-card__body">{children}</div>
  </Card>
);

export const AnalysisVisualization = ({
  visualization,
}: {
  visualization?: VisualizationModel;
}) => {
  if (!visualization) {
    return null;
  }

  if (visualization.kind === "histogram") {
    return (
      <ChartFrame title={visualization.title}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={visualization.bins}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" angle={-20} textAnchor="end" height={60} interval={0} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--chart-teal)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    );
  }

  if (visualization.kind === "bar") {
    return (
      <ChartFrame title={visualization.title}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={visualization.categories}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--chart-amber)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    );
  }

  if (visualization.kind === "scatter") {
    const data = visualization.points.map((point) => ({
      x: point.x,
      y: point.y,
      predicted:
        visualization.line && visualization.line.length === 2
          ? interpolateLine(visualization.line[0], visualization.line[1], point.x)
          : null,
    }));

    return (
      <ChartFrame title={visualization.title}>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" name={visualization.xLabel} />
            <YAxis dataKey="y" type="number" name={visualization.yLabel} />
            <Tooltip />
            {visualization.line ? (
              <Line
                type="linear"
                dataKey="predicted"
                stroke="var(--chart-indigo)"
                dot={false}
                strokeWidth={3}
              />
            ) : null}
            <Scatter dataKey="y" fill="var(--chart-teal-dark)" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
    );
  }

  if (visualization.kind === "group-strip") {
    const groupLabels = visualization.means.reduce<Record<number, string>>((accumulator, item) => {
      accumulator[item.groupIndex] = item.group;
      return accumulator;
    }, {});

    return (
      <ChartFrame title={visualization.title}>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[-0.5, visualization.means.length - 0.5]}
              ticks={visualization.means.map((item) => item.groupIndex)}
              tickFormatter={(value) => groupLabels[value] ?? ""}
            />
            <YAxis dataKey="y" type="number" name={visualization.yLabel} />
            <Tooltip />
            <Scatter data={visualization.points} fill="var(--chart-orange)" />
            <Scatter data={visualization.means.map((item) => ({ x: item.groupIndex, y: item.mean }))} fill="var(--chart-indigo)" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartFrame>
    );
  }

  if (visualization.kind === "paired-differences") {
    return (
      <ChartFrame title={visualization.title}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={visualization.bins}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" angle={-20} textAnchor="end" height={60} interval={0} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--chart-indigo)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="paired-preview">
          <div>
            <strong>{visualization.beforeLabel}</strong>
            <p>{visualization.pairs.length} paired observations</p>
          </div>
          <div>
            <strong>{visualization.afterLabel}</strong>
            <p>Differences are shown as {visualization.afterLabel} minus {visualization.beforeLabel}.</p>
          </div>
        </div>
      </ChartFrame>
    );
  }

  if (visualization.kind === "coefficients") {
    return (
      <ChartFrame title={visualization.title}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={visualization.coefficients} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="label" width={120} />
            <Tooltip
              formatter={(_, __, item) => {
                const payload = item.payload as {
                  estimate: number;
                  lower: number;
                  upper: number;
                };
                return [`${payload.estimate.toFixed(2)} (${payload.lower.toFixed(2)} to ${payload.upper.toFixed(2)})`, "Estimate"];
              }}
            />
            <Legend />
            <Bar dataKey="estimate" fill="var(--chart-indigo)" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title={visualization.title}>
      <div className="contingency-table">
        <table>
          <thead>
            <tr>
              <th>Observed counts</th>
              {visualization.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visualization.rows.map((row, rowIndex) => (
              <tr key={row}>
                <th>{row}</th>
                {visualization.columns.map((column, columnIndex) => (
                  <td key={`${row}-${column}`}>{visualization.observed[rowIndex][columnIndex]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartFrame>
  );
};

const interpolateLine = (
  left: { x: number; y: number },
  right: { x: number; y: number },
  xValue: number,
) => {
  if (right.x === left.x) {
    return left.y;
  }

  const slope = (right.y - left.y) / (right.x - left.x);
  return left.y + slope * (xValue - left.x);
};
