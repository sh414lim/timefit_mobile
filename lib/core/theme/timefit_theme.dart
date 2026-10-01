import 'package:flutter/material.dart';

abstract final class TimeFitColors {
  static const blue = Color(0xFF3182F6);
  static const textPrimary = Color(0xFF191F28);
  static const textSecondary = Color(0xFF6B7684);
  static const background = Color(0xFFF5F7FA);
  static const surface = Colors.white;
  static const divider = Color(0xFFE5E8EB);
  static const danger = Color(0xFFF04452);
}

abstract final class TimeFitTheme {
  static ThemeData light() => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: TimeFitColors.blue,
      surface: TimeFitColors.surface,
      error: TimeFitColors.danger,
    ),
    scaffoldBackgroundColor: TimeFitColors.background,
    fontFamilyFallback: const ['Pretendard', 'Apple SD Gothic Neo'],
    textTheme: const TextTheme(
      headlineMedium: TextStyle(
        fontSize: 26,
        height: 1.3,
        fontWeight: FontWeight.w700,
        color: TimeFitColors.textPrimary,
        letterSpacing: -0.5,
      ),
      titleLarge: TextStyle(
        fontSize: 20,
        height: 1.35,
        fontWeight: FontWeight.w700,
        color: TimeFitColors.textPrimary,
      ),
      titleMedium: TextStyle(
        fontSize: 17,
        height: 1.4,
        fontWeight: FontWeight.w600,
        color: TimeFitColors.textPrimary,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        height: 1.5,
        color: TimeFitColors.textPrimary,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        height: 1.45,
        color: TimeFitColors.textSecondary,
      ),
    ),
    cardTheme: const CardThemeData(
      color: TimeFitColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(20)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(56),
        backgroundColor: TimeFitColors.blue,
        foregroundColor: Colors.white,
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: TimeFitColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 17),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: TimeFitColors.divider),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: TimeFitColors.blue, width: 1.5),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: TimeFitColors.surface,
      indicatorColor: Color(0xFFEAF3FF),
      height: 72,
    ),
  );
}
