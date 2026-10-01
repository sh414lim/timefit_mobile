import 'package:flutter/material.dart';

class StateView extends StatelessWidget {
  const StateView({
    super.key,
    required this.icon,
    required this.title,
    this.description,
    this.actionLabel,
    this.onAction,
  });

  const StateView.empty({
    super.key,
    required this.title,
    this.description,
    this.actionLabel,
    this.onAction,
  }) : icon = Icons.inbox_outlined;

  const StateView.error({
    super.key,
    required this.title,
    this.description,
    this.actionLabel,
    this.onAction,
  }) : icon = Icons.error_outline_rounded;

  final IconData icon;
  final String title;
  final String? description;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 48, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 16),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        if (description != null) ...[
          const SizedBox(height: 8),
          Text(description!, textAlign: TextAlign.center),
        ],
        if (actionLabel != null && onAction != null) ...[
          const SizedBox(height: 24),
          FilledButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ],
    ),
  );
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.label = '불러오는 중이에요'});
  final String label;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const CircularProgressIndicator(),
        const SizedBox(height: 16),
        Text(label),
      ],
    ),
  );
}

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) => Material(
    color: const Color(0xFFFFF4E5),
    child: const SafeArea(
      bottom: false,
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Row(
          children: [
            Icon(Icons.cloud_off_rounded, size: 18),
            SizedBox(width: 8),
            Expanded(child: Text('인터넷 연결이 없어요. 마지막 저장 정보를 표시할 수 있어요.')),
          ],
        ),
      ),
    ),
  );
}
