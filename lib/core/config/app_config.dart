import 'environment.dart';

class AppConfig {
  const AppConfig({
    required this.environment,
    required this.supabaseUrl,
    required this.supabasePublishableKey,
    this.enableQrAttendance = false,
    this.enableMobileScheduleEditing = false,
  });

  const AppConfig.fromEnvironment()
    : environment = const String.fromEnvironment(
        'APP_ENV',
        defaultValue: 'development',
      ),
      supabaseUrl = const String.fromEnvironment('SUPABASE_URL'),
      supabasePublishableKey = const String.fromEnvironment(
        'SUPABASE_PUBLISHABLE_KEY',
        defaultValue: String.fromEnvironment('SUPABASE_ANON_KEY'),
      ),
      enableQrAttendance = const bool.fromEnvironment('FEATURE_QR_ATTENDANCE'),
      enableMobileScheduleEditing = const bool.fromEnvironment(
        'FEATURE_MOBILE_SCHEDULE_EDITING',
      );

  final String environment;
  final String supabaseUrl;
  final String supabasePublishableKey;
  final bool enableQrAttendance;
  final bool enableMobileScheduleEditing;
  bool get isConfigured =>
      supabaseUrl.trim().isNotEmpty && supabasePublishableKey.trim().isNotEmpty;

  AppEnvironment get appEnvironment => AppEnvironmentValue.parse(environment);

  bool get isProduction => appEnvironment == AppEnvironment.production;
}
