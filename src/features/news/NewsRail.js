// src/features/news/NewsRail.js
// Noticias en tarjetas horizontales (foto + titular).
import React, { memo } from 'react';
import { FlatList, Image, View } from 'react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, PressableScale, SkeletonCard } from '../../ui';
import { formatDay } from '../../api/clock';

const Card = memo(function Card({ post, onPress, colors, radius }) {
  return (
    <PressableScale onPress={() => onPress(post)} style={{ width: 240 }}>
      <View style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
        {post.image ? (
          <Image source={{ uri: post.image }} style={{ width: '100%', height: 132, backgroundColor: colors.surfaceHigh }} resizeMode="cover" />
        ) : (
          <View style={{ width: '100%', height: 132, backgroundColor: colors.surfaceHigh }} />
        )}
        <View style={{ padding: 12, gap: 6, minHeight: 92 }}>
          <Txt variant="bodyStrong" numberOfLines={3} style={{ fontSize: 13.5, lineHeight: 18 }}>
            {post.title}
          </Txt>
          {post.date ? (
            <Txt variant="caption" tone="muted">
              {formatDay(post.date)}
            </Txt>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
});

function NewsRail({ posts, loading, onOpen }) {
  const { colors, radius } = useDesign();
  if (loading) {
    return (
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20 }}>
        <SkeletonCard height={230} style={{ width: 240 }} />
        <SkeletonCard height={230} style={{ width: 240 }} />
      </View>
    );
  }
  if (!posts.length) return null;
  return (
    <FlatList
      horizontal
      data={posts}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => <Card post={item} onPress={onOpen} colors={colors} radius={radius} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      snapToInterval={252}
      decelerationRate="fast"
    />
  );
}

export default memo(NewsRail);
