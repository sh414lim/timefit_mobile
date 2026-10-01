import 'package:flutter/material.dart';

enum StatusTone { neutral, info, success, warning, danger }

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    this.tone = StatusTone.neutral,
  });

  final String label;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = switch (tone) {
      StatusTone.neutral => (const Color(0xFFF2F4F6), const Color(0xFF4E5968)),
      StatusTone.info => (const Color(0xFFEAF3FF), const Color(0xFF1B64DA)),
      StatusTone.success => (const Color(0xFFE8F8F1), const Color(0xFF00875A)),
      StatusTone.warning => (const Color(0xFFFFF4E5), const Color(0xFFB35C00)),
      StatusTone.danger => (const Color(0xFFFFECEE), const Color(0xFFD22030)),
    };
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.$1,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(
          label,
          style: TextStyle(
            color: colors.$2,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
