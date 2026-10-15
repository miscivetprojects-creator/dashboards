import React from 'react';

export const CIVET_PALETTE = [
  '#0284C7',
  '#059669',
  '#EA580C',
  '#7C3AED',
  '#EAB308',
  '#BE123C'
];

export const CIVET_PALETTE_STROKES = [
  '#0369A1',
  '#047857',
  '#C2410C',
  '#5B21B6',
  '#A16207',
  '#9F1239'
];

export const CIVET_PILLARS = {
  blue: {
    top: '#0284C7',
    mid: '#38BDF8',
    light: '#BAE6FD',
    base: '#E0F2FE',
    stroke: '#0369A1',
    gradId: 'civetGradBlue',
    gradHId: 'civetGradBlueH'
  },
  green: {
    top: '#059669',
    mid: '#34D399',
    light: '#6EE7B7',
    base: '#D1FAE5',
    stroke: '#047857',
    gradId: 'civetGradGreen',
    gradHId: 'civetGradGreenH'
  },
  orange: {
    top: '#EA580C',
    mid: '#FB923C',
    light: '#FDBA74',
    base: '#FFEDD5',
    stroke: '#C2410C',
    gradId: 'civetGradOrange',
    gradHId: 'civetGradOrangeH'
  },
  purple: {
    top: '#7C3AED',
    mid: '#A78BFA',
    light: '#C084FC',
    base: '#EDE9FE',
    stroke: '#5B21B6',
    gradId: 'civetGradPurple',
    gradHId: 'civetGradPurpleH'
  },
  yellow: {
    top: '#EAB308',
    mid: '#FDE047',
    light: '#FEF08A',
    base: '#FFEDB9',
    stroke: '#A16207',
    gradId: 'civetGradYellow',
    gradHId: 'civetGradYellowH'
  },
  rose: {
    top: '#BE123C',
    mid: '#FB7185',
    light: '#FDA4AF',
    base: '#FFE4E6',
    stroke: '#9F1239',
    gradId: 'civetGradRose',
    gradHId: 'civetGradRoseH'
  }
};

export const ChartDefs = ({ idPrefix = 'civet' }) => (
  <defs>
    <filter id={`${idPrefix}BarShadow`} x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.22" />
    </filter>
    <filter id={`${idPrefix}PieShadow`} x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="2.5" floodColor="#0F2A4A" floodOpacity="0.20" />
    </filter>
    <filter id={`${idPrefix}LineShadow`} x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#0F2A4A" floodOpacity="0.25" />
    </filter>

    <linearGradient id={`${idPrefix}GradBlue`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#38BDF8" />
      <stop offset="100%" stopColor="#0284C7" />
    </linearGradient>
    <linearGradient id={`${idPrefix}GradGreen`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#34D399" />
      <stop offset="100%" stopColor="#059669" />
    </linearGradient>
    <linearGradient id={`${idPrefix}GradOrange`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FB923C" />
      <stop offset="100%" stopColor="#EA580C" />
    </linearGradient>
    <linearGradient id={`${idPrefix}GradPurple`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#A78BFA" />
      <stop offset="100%" stopColor="#7C3AED" />
    </linearGradient>
    <linearGradient id={`${idPrefix}GradYellow`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FDE047" />
      <stop offset="100%" stopColor="#EAB308" />
    </linearGradient>
    <linearGradient id={`${idPrefix}GradRose`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FB7185" />
      <stop offset="100%" stopColor="#BE123C" />
    </linearGradient>

    <linearGradient id={`${idPrefix}GradBlueH`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#38BDF8" />
      <stop offset="100%" stopColor="#0284C7" />
    </linearGradient>
    <linearGradient id={`${idPrefix}GradGreenH`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#34D399" />
      <stop offset="100%" stopColor="#059669" />
    </linearGradient>
    <linearGradient id={`${idPrefix}GradOrangeH`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#FB923C" />
      <stop offset="100%" stopColor="#EA580C" />
    </linearGradient>
    <linearGradient id={`${idPrefix}GradPurpleH`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#A78BFA" />
      <stop offset="100%" stopColor="#7C3AED" />
    </linearGradient>
    <linearGradient id={`${idPrefix}GradYellowH`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#FDE047" />
      <stop offset="100%" stopColor="#EAB308" />
    </linearGradient>
    <linearGradient id={`${idPrefix}GradRoseH`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#FB7185" />
      <stop offset="100%" stopColor="#BE123C" />
    </linearGradient>
  </defs>
);
