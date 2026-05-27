import React, { useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, {
  Ellipse, Rect, Path, Polygon, Line, Circle,
} from "react-native-svg";

export type ARGuideCharacterRef = {
  setSpeaking: (v: boolean) => void;
  setPointing: (v: boolean) => void;
};

type Props = { width?: number; height?: number };

const VW = 160; // viewBox width
const VH = 260; // viewBox height
const CX = 80;  // center X

// Hat woven pattern — 22 alternating wedges
const hatWedges = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2;
  const isBlack = i % 2 === 0;
  const ix = CX + 7 * Math.cos(angle);
  const iy = 42 + 3 * Math.sin(angle);
  const ox1 = CX + 58 * Math.cos(angle - 0.14);
  const oy1 = 42 + 13 * Math.sin(angle - 0.14);
  const ox2 = CX + 58 * Math.cos(angle + 0.14);
  const oy2 = 42 + 13 * Math.sin(angle + 0.14);
  return { i, isBlack, pts: `${ix},${iy} ${ox1},${oy1} ${ox2},${oy2}` };
});

// Crown stripes
const crownStripes = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI;
  const isBlack = i % 2 === 0;
  return { i, isBlack, x: CX + 22 * Math.cos(angle), y: 25 + 12 * Math.sin(angle) };
});

const ARGuideCharacter = forwardRef<ARGuideCharacterRef, Props>(
  ({ width = 160, height = 260 }, ref) => {
    const floatAnim = useRef(new Animated.Value(0)).current;
    const swayAnim  = useRef(new Animated.Value(0)).current;
    const jawAnim   = useRef(new Animated.Value(0)).current; // 0 = closed, 1 = open
    const armAnim   = useRef(new Animated.Value(0)).current;
    const speakLoop = useRef<Animated.CompositeAnimation | null>(null);

    // Idle float + sway — forever
    useEffect(() => {
      const f = Animated.loop(Animated.sequence([
        Animated.timing(floatAnim, { toValue: -7, duration: 1400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue:  0, duration: 1400, useNativeDriver: true }),
      ]));
      const s = Animated.loop(Animated.sequence([
        Animated.timing(swayAnim, { toValue:  1, duration: 2600, useNativeDriver: true }),
        Animated.timing(swayAnim, { toValue: -1, duration: 2600, useNativeDriver: true }),
      ]));
      f.start(); s.start();
      return () => { f.stop(); s.stop(); };
    }, []);

    useImperativeHandle(ref, () => ({
      setSpeaking: (v) => {
        speakLoop.current?.stop();
        if (v) {
          const lp = Animated.loop(Animated.sequence([
            Animated.timing(jawAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.timing(jawAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          ]));
          lp.start();
          speakLoop.current = lp;
        } else {
          Animated.timing(jawAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();
        }
      },
      setPointing: (v) => {
        Animated.spring(armAnim, { toValue: v ? 1 : 0, useNativeDriver: true, tension: 70, friction: 8 }).start();
      },
    }));

    const sway    = swayAnim.interpolate({ inputRange: [-1, 1], outputRange: ["-2deg", "2deg"] });
    const armRot  = armAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-42deg"] });
    // Jaw scaleY: jawAnim 0→1 maps to scaleY 0→1 (reveals the lower jaw)
    const jawScale = jawAnim.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] });

    // Scale the SVG to fit width/height
    const scaleX = width  / VW;
    const scaleY = height / VH;

    return (
      <Animated.View style={[
        { width, height },
        { transform: [{ translateY: floatAnim }, { rotate: sway }] },
      ]}>
        {/* ─── MAIN STATIC CHARACTER ─── */}
        <Svg width={width} height={height} viewBox={`0 0 ${VW} ${VH}`}>

          {/* Shadow */}
          <Ellipse cx={CX} cy={252} rx={30} ry={7} fill="rgba(0,0,0,0.25)" />

          {/* LEGS */}
          <Rect x={CX - 20} y={194} width={16} height={52} rx={6} fill="#2C3E50" />
          <Rect x={CX + 4}  y={194} width={16} height={52} rx={6} fill="#2C3E50" />
          <Rect x={CX - 24} y={242} width={22} height={11} rx={4} fill="#3E2200" />
          <Rect x={CX + 2}  y={242} width={22} height={11} rx={4} fill="#3E2200" />

          {/* MOCHILA WAYUU (behind body) */}
          <Rect x={CX - 13} y={138} width={24} height={38} rx={4} fill="#C0392B" />
          <Rect x={CX - 12} y={140} width={22} height={4} rx={1} fill="#F4D03F" />
          <Rect x={CX - 12} y={146} width={22} height={4} rx={1} fill="#27AE60" />
          <Rect x={CX - 12} y={152} width={22} height={4} rx={1} fill="#9B59B6" />
          <Rect x={CX - 12} y={158} width={22} height={4} rx={1} fill="#E67E22" />
          <Rect x={CX - 12} y={164} width={22} height={4} rx={1} fill="#1A5F7A" />
          <Rect x={CX - 12} y={170} width={22} height={4} rx={1} fill="#F4D03F" />
          <Path d={`M ${CX + 6} 176 Q ${CX + 20} 166 ${CX + 12} 138`}
            fill="none" stroke="#7B241C" strokeWidth={5} strokeLinecap="round" />

          {/* BODY / RUANA TEAL */}
          <Rect x={CX - 28} y={128} width={56} height={68} rx={9} fill="#1A5F7A" />
          <Polygon points={`${CX - 28},${194} ${CX - 44},${244} ${CX - 28},${244}`} fill="#16527E" />
          <Polygon points={`${CX + 28},${194} ${CX + 44},${244} ${CX + 28},${244}`} fill="#16527E" />
          {/* Belt */}
          <Rect x={CX - 29} y={190} width={58} height={8} rx={3} fill="#D4AC0D" />
          {/* Collar V */}
          <Line x1={CX - 12} y1={128} x2={CX}      y2={142} stroke="#F4D03F" strokeWidth={3} strokeLinecap="round" />
          <Line x1={CX + 12} y1={128} x2={CX}      y2={142} stroke="#F4D03F" strokeWidth={3} strokeLinecap="round" />

          {/* LEFT ARM */}
          <Rect x={CX - 44} y={132} width={17} height={44} rx={8} fill="#1A5F7A" />
          <Ellipse cx={CX - 36} cy={183} rx={10} ry={10} fill="#C0805A" />

          {/* NECK */}
          <Rect x={CX - 10} y={113} width={20} height={17} rx={5} fill="#C0805A" />

          {/* HEAD */}
          <Ellipse cx={CX} cy={85} rx={32} ry={34} fill="#C0805A" />
          <Ellipse cx={CX - 33} cy={85} rx={9} ry={12} fill="#B07040" />
          <Ellipse cx={CX + 33} cy={85} rx={9} ry={12} fill="#B07040" />

          {/* Eyebrows */}
          <Path d={`M ${CX - 22} 73 Q ${CX - 15} 68 ${CX - 8} 73`}
            fill="none" stroke="#3C1A00" strokeWidth={2.5} strokeLinecap="round" />
          <Path d={`M ${CX + 22} 73 Q ${CX + 15} 68 ${CX + 8} 73`}
            fill="none" stroke="#3C1A00" strokeWidth={2.5} strokeLinecap="round" />

          {/* Eyes */}
          <Ellipse cx={CX - 12} cy={81} rx={9} ry={8} fill="#fff" />
          <Ellipse cx={CX + 12} cy={81} rx={9} ry={8} fill="#fff" />
          <Ellipse cx={CX - 12} cy={81} rx={5.5} ry={5.5} fill="#5D3A1A" />
          <Ellipse cx={CX + 12} cy={81} rx={5.5} ry={5.5} fill="#5D3A1A" />
          <Ellipse cx={CX - 11} cy={80} rx={2.8} ry={2.8} fill="#111" />
          <Ellipse cx={CX + 13} cy={80} rx={2.8} ry={2.8} fill="#111" />
          <Ellipse cx={CX - 9}  cy={78} rx={1.5} ry={1.5} fill="#fff" />
          <Ellipse cx={CX + 15} cy={78} rx={1.5} ry={1.5} fill="#fff" />

          {/* Nose */}
          <Ellipse cx={CX} cy={91} rx={4.5} ry={3.5} fill="#AA7050" />

          {/* Cheeks */}
          <Ellipse cx={CX - 23} cy={87} rx={9} ry={6} fill="rgba(200,120,80,0.26)" />
          <Ellipse cx={CX + 23} cy={87} rx={9} ry={6} fill="rgba(200,120,80,0.26)" />

          {/* Upper lip */}
          <Path d={`M ${CX - 10} 99 Q ${CX} 105 ${CX + 10} 99`}
            fill="none" stroke="#6B2D0A" strokeWidth={2} strokeLinecap="round" />

          {/* SOMBRERO VUELTIAO */}
          {/* Brim base */}
          <Ellipse cx={CX} cy={43} rx={60} ry={14} fill="#F2EDD0" />
          {/* Woven wedges */}
          {hatWedges.map(({ i, isBlack, pts }) => (
            <Polygon key={i} points={pts}
              fill={isBlack ? "rgba(20,20,20,0.88)" : "rgba(200,162,0,0.88)"} />
          ))}
          <Ellipse cx={CX} cy={43} rx={8} ry={4} fill="#F2EDD0" />
          {/* Crown */}
          <Path
            d={`M ${CX - 24} 43 L ${CX - 25} 13 Q ${CX - 25} 3 ${CX} 3 Q ${CX + 25} 3 ${CX + 25} 13 L ${CX + 24} 43 Z`}
            fill="#F2EDD0"
          />
          {/* Crown stripes */}
          {crownStripes.map(({ i, isBlack, x, y }) => (
            <Line key={i} x1={CX} y1={43} x2={x} y2={y}
              stroke={isBlack ? "rgba(20,20,20,0.72)" : "rgba(200,162,0,0.72)"}
              strokeWidth={3.5}
            />
          ))}
          {/* Hat band */}
          <Ellipse cx={CX} cy={44} rx={26} ry={7}
            fill="none" stroke="#E8C000" strokeWidth={5} />

        </Svg>

        {/* ─── ANIMATED RIGHT ARM (pointing) ─── */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              top:  132 * scaleY,
              left: (CX + 27) * scaleX,
              width:  70 * scaleX,
              height: 110 * scaleY,
              transformOrigin: "0% 0%",
              transform: [{ rotate: armRot }],
            },
          ]}
          pointerEvents="none"
        >
          <Svg width={70 * scaleX} height={110 * scaleY} viewBox="0 0 70 110">
            <Rect x={0}  y={0}  width={17} height={44} rx={8} fill="#1A5F7A" />
            <Ellipse cx={8} cy={52} rx={10} ry={10} fill="#C0805A" />
            {/* Map scroll */}
            <Rect x={-4} y={56} width={30} height={23} rx={3} fill="#F9F0D0" />
            <Rect x={-4} y={56} width={30} height={23} rx={3} fill="none" stroke="#C8A200" strokeWidth={1.5} />
            <Line x1={-1} y1={61} x2={21} y2={61} stroke="#1A5F7A" strokeWidth={1.2} strokeLinecap="round" />
            <Line x1={-1} y1={65} x2={23} y2={65} stroke="#1A5F7A" strokeWidth={1.2} strokeLinecap="round" />
            <Line x1={-1} y1={69} x2={18} y2={69} stroke="#1A5F7A" strokeWidth={1.2} strokeLinecap="round" />
            <Circle cx={10} cy={60} r={3.5} fill="#E74C3C" />
          </Svg>
        </Animated.View>

        {/* ─── ANIMATED JAW (speaking) ─── */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              position: "absolute",
              top:    (99 + 2) * scaleY,  // just below upper lip
              left:   (CX - 10) * scaleX,
              width:  20 * scaleX,
              height: 8  * scaleY,
              overflow: "hidden",
              transformOrigin: "50% 0%",
              transform: [{ scaleY: jawScale }],
            },
          ]}
          pointerEvents="none"
        >
          <Svg width={20 * scaleX} height={8 * scaleY} viewBox="0 0 20 8">
            <Ellipse cx={10} cy={0} rx={10} ry={7} fill="#C0805A" />
            <Rect x={2} y={0} width={16} height={4} rx={2} fill="#FFFAF0" />
          </Svg>
        </Animated.View>

      </Animated.View>
    );
  }
);

ARGuideCharacter.displayName = "ARGuideCharacter";
export { ARGuideCharacter };

const styles = StyleSheet.create({});
