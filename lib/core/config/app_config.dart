class AppConfig {
  const AppConfig({
    required this.environment,
    required this.supabaseUrl,
    required this.supabasePublishableKey,
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
      );

  final String environment;
  final String supabaseUrl;
  final String supabasePublishableKey;
  bool get isConfigured =>
      supabaseUrl.trim().isNotEmpty && supabasePublishableKey.trim().isNotEmpty;
}
