import 'package:package_info_plus/package_info_plus.dart';

class AppMetadata {
  const AppMetadata({required this.version, required this.buildNumber});

  factory AppMetadata.empty() =>
      const AppMetadata(version: '-', buildNumber: '-');

  static Future<AppMetadata> load() async {
    final info = await PackageInfo.fromPlatform();
    return AppMetadata(version: info.version, buildNumber: info.buildNumber);
  }

  final String version;
  final String buildNumber;

  String get displayVersion => '$version ($buildNumber)';
}
