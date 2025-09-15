import React, { useEffect, useState } from "react";
import { CardType, PlayerStateType, RuleType } from "../../shared/types/api";
import { useGameState } from "../GameStateContext";
import { RuleHand } from "./RuleSpinner";

/**
 * TableView.tsx
 *
 * Props:
 *  - width, height: optional svg size (defaults)
 *  - player: { id, name, cards: CardType[] }
 *  - dealerHand: CardType[]
 *  - dealerRules: RuleType[] (displayed as stacked rule cards)
 *  - lastCard: CardType | null
 *  - onCardClick?: (card: CardType, source: "player"|"dealer"|"last"|"rule", index?: number) => void
 *
 * CardType: { suit: string, value: string | number, id?: string|number }
 * RuleType: { id: string|number, description?: string }
 */


type TableViewProps = {
  width?: number;
  height?: number;
  dealerHand: CardType[];
  dealerRules?: RuleType[];
  lastCard?: CardType | null;
  onCardClick?: (
    card: CardType,
    source: "player" | "dealer" | "last" | "rule",
    index?: number
  ) => void;
};


export default function TableView({
  width = 900,
  height = 600,
  lastCard = null,
}: TableViewProps) {
  // Layout params
  const tableRadiusX = width * 0.48;
  const tableRadiusY = height * 0.42;
  const centerX = width / 2;
  const centerY = height / 2;

  const [player, setPlayer] = useState<PlayerStateType>({ id: "0", name: "Player", handCounts:[], handSize:0, handPreview:{cards:[],overflow:0} });
  const [dealerHand, setDealerHand] = useState<RuleType[]>([]);

  // helper to render a card rect with suit/value
  const CardSVG = ({
    card,
    w = 80,
    h = 120,
    onClick,
    faceUp = true,
    className = "",
  }: {
    card: string;
    w?: number;
    h?: number;
    onClick?: () => void;
    faceUp?: boolean;
    className?: string;
  }) => {
    const bg = faceUp ? "#fff" : "#1f2937"; // white face / dark back
    const fg = faceUp ? "#111827" : "#fff";
    const border = faceUp ? "#e5e7eb" : "#374151";
  
    // relative font sizes
    const cornerFontSize = Math.min(w, h) * 0.15; // ~15% of smaller side
    const centerFontSize = Math.min(w, h) * 0.3;  // ~30% for big value
  
    return (
      <g
        onClick={onClick}
        style={{ cursor: onClick ? "pointer" : "default" }}
        className={className}
      >
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={8}
          ry={8}
          fill={bg}
          stroke={border}
          strokeWidth={2}
        />
        {faceUp ? (
          <>
            {/* Top-left corner */}
            <text
              x={-w / 2 + 8}
              y={-h / 2 + cornerFontSize + 2}
              fontSize={cornerFontSize}
              fontWeight={700}
              fill={fg}
            >
              {card}
            </text>
            {/* Bottom-right corner */}
            <text
              x={w / 2 - 8}
              y={h / 2 - 8}
              fontSize={cornerFontSize}
              fontWeight={600}
              fill={fg}
              textAnchor="end"
            >
              {card}
            </text>
            {/* Center big suit/value */}
            <text
              x={0}
              y={centerFontSize / 3}
              fontSize={centerFontSize}
              fontWeight={700}
              fill={fg}
              textAnchor="middle"
            >
              {card}
            </text>
          </>
        ) : (
          // back pattern
          <g>
            <rect
              x={-w / 2 + 8}
              y={-h / 2 + 8}
              width={w - 16}
              height={h - 16}
              rx={6}
              fill="rgba(255,255,255,0.06)"
            />
            <text
              x={0}
              y={centerFontSize / 3}
              fontSize={centerFontSize}
              fontWeight={700}
              fill={fg}
              textAnchor="middle"
            >
              ★
            </text>
          </g>
        )}
      </g>
    );
  };
  
  const TableSVG = () => {
    const width = 800;
    const height = 600;
  
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        className="bg-green-800 rounded-lg"
      >
        {/* Dealer hand (bottom center) */}
        <RuleHand/>
  
        {/* Dealer rules (middle) */}
        <g transform={`translate(${width / 2}, ${height / 2 + 50})`}>
          {["Rule1", "Rule2"].map((rule, i) => (
            <g key={i} transform={`translate(${i * 80 - 40}, 0)`}>
              <CardSVG card={rule} w={70} h={100} />
            </g>
          ))}
        </g>
  
        {/* Last placed card (above dealer rules) */}
        <g transform={`translate(${width / 2}, ${height / 2 - 40})`}>
          <CardSVG card="7♣" w={80} h={120} />
        </g>
  
        {/* Player hand (top center) */}
        <g transform={`translate(${width / 2}, 120)`}>
          {["2♥", "3♥", "4♥", "5♥"].map((card, i) => (
            <g key={i} transform={`translate(${i * 40 - 60}, 0)`}>
              <CardSVG card={card} w={60} h={90} faceUp />
            </g>
          ))}
        </g>
      </svg>
    );
  };
  
  

  // compute positions for a fanned hand (arc) — returns list of transforms
  function fanPositions(count: number, radius: number, centerY: number, startAngle = -60, endAngle = 60) {
    // startAngle and endAngle in degrees (spread)
    const positions: { x: number; y: number; rotate: number }[] = [];
    if (count <= 1) {
      positions.push({ x: centerX, y: centerY, rotate: 0 });
      return positions;
    }
    const step = (endAngle - startAngle) / (count - 1);
    for (let i = 0; i < count; i++) {
      const angleDeg = startAngle + step * i;
      const angle = (angleDeg * Math.PI) / 180;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      positions.push({ x, y, rotate: angleDeg });
    }
    return positions;
  }

  // Dealer (bottom) fan
  const dealerRadius = Math.min(tableRadiusX, tableRadiusY) * 0.75;
  const dealerPositions = fanPositions(dealerHand.length, dealerRadius, centerY + tableRadiusY * 0.45, -110, -70);

  // Player (top) fan - single player only
  const playerRadius = Math.min(tableRadiusX, tableRadiusY) * 0.75;
  const playerPositions = fanPositions(player.handCounts.length, playerRadius, centerY - tableRadiusY * 0.45, 70, 110);

  // dealer rules stack position (just above dealer hand)
  const rulesX = centerX;
  const rulesY = centerY + tableRadiusY * 0.05;

  // last card position (center-ish)
  const lastX = centerX;
  const lastY = centerY - tableRadiusY * 0.12;

  // small helper to key

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", background: "#0b3b2e" }}
    >
      {/* Table surface (oval) */}
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>

      <g transform={`translate(0,0)`}>
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={tableRadiusX}
          ry={tableRadiusY}
          fill="#1f6f53"
          stroke="#0f3e2e"
          strokeWidth={6}
          filter="url(#shadow)"
        />

        <TableSVG />

      </g>
    </svg>
  );
}
