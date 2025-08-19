import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface ProgressBarProps {
  used: number;
  limit: number;
  height?: number;
  barColor?: string;
  backgroundColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  used,
  limit,
  height = 12,
  barColor = "#4CAF50",
  backgroundColor = "#E0E0E0",
}) => {
  const progress = Math.min(used / limit, 1); // clamp between 0 and 1

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View
        style={[
          styles.barBackground,
          { height, backgroundColor: backgroundColor },
        ]}
      >
        <View
          style={[
            styles.barFill,
            { width: `${progress * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>

      {/* Labels */}
      <View style={styles.labelsContainer}>
        <Text style={styles.label}>{used} used</Text>
        <Text style={styles.label}>{limit} total</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  barBackground: {
    width: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  labelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    color: "#5D4E37",
  },
});
