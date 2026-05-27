import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import {
  createCandidate,
  getCandidateDetail,
  updateCandidate,
} from '@/src/api/candidate';
import { useAuth } from '@/src/auth/AuthProvider';
import { AppHeader } from '@/src/ui/components/AppHeader';
import { useTokens } from '@/src/ui/tokens';

type PdMode = 'price' | 'date' | 'none';
type ImgTab = 'gallery' | 'url';

export default function CandidateEditScreen() {
  const t = useTokens();
  const router = useRouter();
  const { user } = useAuth();
  const memberSeq = user?.memberSeq;

  const params = useLocalSearchParams<{
    candidateSeq?: string;
    topicSeq?: string;
  }>();

  const candidateSeqParam = typeof params.candidateSeq === 'string' ? params.candidateSeq : '';
  const topicSeqParam = typeof params.topicSeq === 'string' ? params.topicSeq : '';
  const candidateSeq = candidateSeqParam ? Number.parseInt(candidateSeqParam, 10) : Number.NaN;
  const topicSeq = topicSeqParam ? Number.parseInt(topicSeqParam, 10) : Number.NaN;
  const isEdit = Number.isFinite(candidateSeq) && candidateSeq > 0;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [pdMode, setPdMode] = useState<PdMode>('price');
  const [priceText, setPriceText] = useState('');
  const [dateText, setDateText] = useState(todayIsoDate());
  const [timeText, setTimeText] = useState('');
  const [info, setInfo] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imgTab, setImgTab] = useState<ImgTab>('gallery');
  const [previewUri, setPreviewUri] = useState<string>('');

  const loadDetail = useCallback(async () => {
    if (!(isEdit && memberSeq != null)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const row = await getCandidateDetail(candidateSeq, memberSeq);
      setName(row.name);
      setPriceText(row.price != null ? String(row.price) : '');
      setInfo(row.info ?? '');
      setImageUrl(row.imageUrl ?? '');
      setLinkUrl(row.linkUrl ?? '');
      setPreviewUri(row.imageUrl ?? '');
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : '후보 정보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [candidateSeq, isEdit, memberSeq]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage('후보 이름을 입력해 주세요.');
      return;
    }
    if (memberSeq == null || !Number.isFinite(topicSeq) || topicSeq <= 0) {
      setMessage('안건 정보가 올바르지 않습니다.');
      return;
    }

    const priceNum =
      pdMode === 'price' && priceText.trim()
        ? Number.parseInt(priceText.replaceAll(',', ''), 10)
        : null;
    if (pdMode === 'price' && priceText.trim() && (!Number.isFinite(priceNum) || (priceNum ?? 0) < 0)) {
      setMessage('가격은 숫자로 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        memberSeq,
        topicSeq,
        name: trimmedName,
        info: info.trim() || null,
        price: priceNum,
        imageUrl: (previewUri || imageUrl).trim() || null,
        linkUrl: linkUrl.trim() || null,
      };

      if (isEdit) {
        await updateCandidate(candidateSeq, payload);
        Alert.alert('저장 완료', '후보가 수정되었어요.', [
          { text: '확인', onPress: () => router.back() },
        ]);
      } else {
        await createCandidate(payload);
        Alert.alert('등록 완료', '후보가 등록되었어요.', [
          { text: '확인', onPress: () => router.back() },
        ]);
      }
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : '저장에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!Number.isFinite(topicSeq) || topicSeq <= 0) {
    return (
      <View style={[styles.root, { backgroundColor: t.colors.background }]}>
        <AppHeader title="후보" leftIconName="chevron-left" onPressLeft={() => router.back()} />
        <View style={styles.center}>
          <Text style={{ color: t.colors.text }}>안건 번호(topicSeq)가 필요합니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: '#F2EFE9' }]}>
      <AppHeader
        title={isEdit ? '후보 수정' : '후보 등록'}
        leftIconName="chevron-left"
        onPressLeft={() => router.back()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.colors.tint} />
          <Text style={[styles.help, { color: t.colors.subtext, marginTop: 10 }]}>
            후보 정보를 불러오는 중이에요
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={56}>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.imgSection} lightColor="transparent" darkColor="transparent">
              <Pressable
                onPress={() => {
                  if (imgTab === 'url') return;
                  Alert.alert('사진첩', '사진 업로드는 잠시 비활성화했어요. URL 입력을 사용해 주세요.');
                }}
                style={({ pressed }) => [
                  styles.imgUploadArea,
                  previewUri ? styles.imgUploadAreaHasImg : null,
                  { opacity: pressed ? 0.95 : 1 },
                ]}>
                {previewUri ? (
                  <>
                    <Image source={{ uri: previewUri }} style={styles.imgPreview} />
                    <Pressable
                      onPress={() => setPreviewUri('')}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.imgRemoveBtn,
                        { opacity: pressed ? 0.8 : 1 },
                      ]}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✕</Text>
                    </Pressable>
                  </>
                ) : (
                  <RNView style={styles.imgUploadInner}>
                    <RNView style={styles.uploadIconWrap}>
                      <Text style={{ fontSize: 24 }}>📷</Text>
                    </RNView>
                    <Text style={styles.imgUploadLabel}>
                      사진을 추가해주세요{'\n'}
                      <Text style={{ fontSize: 11, color: '#A09890' }}>탭하거나 아래에서 선택</Text>
                    </Text>
                  </RNView>
                )}
              </Pressable>

              <RNView style={styles.imgTabs}>
                <SegTab active={imgTab === 'gallery'} onPress={() => setImgTab('gallery')} label="📱 사진첩" />
                <SegTab active={imgTab === 'url'} onPress={() => setImgTab('url')} label="🔗 URL 입력" />
              </RNView>

              {imgTab === 'gallery' ? (
                <RNView style={styles.imgTabPanel}>
                  <Pressable
                    onPress={() =>
                      Alert.alert('사진첩', '사진 업로드는 잠시 비활성화했어요. URL 입력을 사용해 주세요.')
                    }
                    style={({ pressed }) => [styles.galleryBtn, { opacity: pressed ? 0.9 : 1 }]}>
                    <Text style={{ fontSize: 18 }}>🖼️</Text>
                    <Text style={styles.galleryBtnText}>사진첩에서 선택</Text>
                  </Pressable>
                  <Text style={styles.fieldHint}>jpg, png, gif 등 이미지 파일을 선택해요</Text>
                </RNView>
              ) : (
                <RNView style={styles.imgTabPanel}>
                  <Text style={styles.fieldLabelSmall}>이미지 URL</Text>
                  <RNView style={styles.urlFetchRow}>
                    <TextInput
                      value={imageUrl}
                      onChangeText={setImageUrl}
                      style={[styles.urlInput, { color: '#2C2820' }]}
                      placeholder="https://..."
                      placeholderTextColor="#A09890"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable
                      onPress={() => setPreviewUri(imageUrl.trim())}
                      style={({ pressed }) => [styles.fetchBtn, { opacity: pressed ? 0.9 : 1 }]}>
                      <Text style={styles.fetchBtnText}>불러오기</Text>
                    </Pressable>
                  </RNView>
                  <Text style={styles.fieldHint}>이미지 주소를 붙여넣고 불러오기를 눌러요</Text>
                </RNView>
              )}
            </View>

            <View style={styles.sectionCard} lightColor="transparent" darkColor="transparent">
              <FieldLine label="후보 이름" required>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.inputBase}
                  placeholder="예) 쿠우쿠우 스시뷔페"
                  placeholderTextColor="#A09890"
                  maxLength={50}
                />
              </FieldLine>

              <Divider />

              <FieldLine label="가격 또는 날짜">
                <RNView style={styles.pdToggle}>
                  <PdTab active={pdMode === 'price'} onPress={() => setPdMode('price')} label="가격 (원)" />
                  <PdTab active={pdMode === 'date'} onPress={() => setPdMode('date')} label="날짜" />
                  <PdTab active={pdMode === 'none'} onPress={() => setPdMode('none')} label="—" />
                </RNView>

                {pdMode === 'price' ? (
                  <RNView style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>₩</Text>
                    <TextInput
                      value={priceText}
                      onChangeText={setPriceText}
                      style={[styles.inputBase, styles.inputHasIcon]}
                      placeholder="39,000"
                      placeholderTextColor="#A09890"
                      keyboardType="number-pad"
                    />
                  </RNView>
                ) : pdMode === 'date' ? (
                  <>
                    <RNView style={styles.dateRow}>
                      <TextInput
                        value={dateText}
                        onChangeText={setDateText}
                        style={[styles.inputBase, styles.dateInput]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#A09890"
                      />
                      <TextInput
                        value={timeText}
                        onChangeText={setTimeText}
                        style={[styles.inputBase, styles.dateInput]}
                        placeholder="HH:MM"
                        placeholderTextColor="#A09890"
                      />
                    </RNView>
                    <Text style={styles.fieldHint}>날짜를 선택하면 Pick! 후 캘린더에 자동 등록할 수 있어요</Text>
                  </>
                ) : (
                  <Text style={[styles.fieldHint, { paddingVertical: 8 }]}>가격이나 날짜 없이 등록해요</Text>
                )}
              </FieldLine>
            </View>

            <View style={styles.sectionCard} lightColor="transparent" darkColor="transparent">
              <FieldLine label="상세 정보">
                <TextInput
                  value={info}
                  onChangeText={setInfo}
                  style={[styles.inputBase, styles.textArea]}
                  placeholder="메모, 특징, 이유 등을 적어주세요"
                  placeholderTextColor="#A09890"
                  multiline
                  textAlignVertical="top"
                />
              </FieldLine>

              <Divider />

              <FieldLine label="링크 URL">
                <TextInput
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  style={styles.inputBase}
                  placeholder="https://"
                  placeholderTextColor="#A09890"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.fieldHint}>상품 페이지, 예약 링크 등을 붙여넣으면 카드에서 바로 열 수 있어요</Text>
              </FieldLine>
            </View>

            {message ? (
              <View style={styles.banner} lightColor="transparent" darkColor="transparent">
                <Text style={{ color: '#2C2820', fontSize: 12 }}>{message}</Text>
              </View>
            ) : null}

            <Text style={styles.metaText}>
              topicSeq: {topicSeq}
              {isEdit ? ` · candidateSeq: ${candidateSeq}` : ''}
            </Text>
          </ScrollView>

          <View style={styles.bottomArea} pointerEvents="box-none">
            <Pressable
              onPress={handleSave}
              disabled={submitting}
              style={({ pressed }) => [
                styles.submitBtn,
                { opacity: submitting ? 0.55 : pressed ? 0.92 : 1 },
              ]}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>{isEdit ? '후보 수정' : '후보 등록'}</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function FieldLine({
  label,
  required,
  children,
}: Readonly<{
  label: string;
  required?: boolean;
  children: ReactNode;
}>) {
  return (
    <RNView style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label} {required ? <Text style={styles.req}>*</Text> : null}
      </Text>
      {children}
    </RNView>
  );
}

function Divider() {
  return <RNView style={styles.divider} />;
}

function SegTab({ active, onPress, label }: Readonly<{ active: boolean; onPress: () => void; label: string }>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.imgTab,
        active && styles.imgTabActive,
        { opacity: pressed ? 0.9 : 1 },
      ]}>
      <Text style={[styles.imgTabText, active && styles.imgTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PdTab({ active, onPress, label }: Readonly<{ active: boolean; onPress: () => void; label: string }>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pdTab,
        active && styles.pdTabActive,
        { opacity: pressed ? 0.9 : 1 },
      ]}>
      <Text style={[styles.pdTabText, active && styles.pdTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function todayIsoDate() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  formScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140, gap: 20 },
  imgSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(44,40,32,0.06)',
    overflow: 'hidden',
  },
  imgUploadArea: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#F2EFE9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  imgUploadAreaHasImg: { backgroundColor: '#000' },
  imgPreview: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.92 },
  imgUploadInner: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  uploadIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(44,40,32,0.12)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgUploadLabel: { fontSize: 13, color: '#6B6560', textAlign: 'center', lineHeight: 19 },
  imgRemoveBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgTabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(44,40,32,0.06)' },
  imgTab: { flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  imgTabActive: { backgroundColor: 'rgba(126,186,181,0.08)', borderBottomWidth: 2, borderBottomColor: '#7EBAB5' },
  imgTabText: { fontSize: 12, color: '#A09890', fontWeight: '600' },
  imgTabTextActive: { color: '#4E9A94' },
  imgTabPanel: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  galleryBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C8E8E6',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(126,186,181,0.08)',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryBtnText: { fontSize: 14, fontWeight: '700', color: '#4E9A94' },
  fieldLabelSmall: { fontSize: 12, color: '#6B6560', marginBottom: 6 },
  urlFetchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  urlInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#F2EFE9',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(44,40,32,0.12)',
  },
  fetchBtn: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(126,186,181,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C8E8E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fetchBtnText: { fontSize: 12, fontWeight: '800', color: '#4E9A94' },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(44,40,32,0.06)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 16,
  },
  field: { gap: 7 },
  fieldLabel: { fontSize: 12, color: '#6B6560', letterSpacing: 0.2 },
  req: { color: '#D9534F', fontSize: 14, fontWeight: '800' },
  inputBase: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2C2820',
    backgroundColor: '#F2EFE9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(44,40,32,0.12)',
    borderRadius: 10,
  },
  textArea: { minHeight: 84, lineHeight: 22 },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 13, zIndex: 2, color: '#A09890', fontSize: 16 },
  inputHasIcon: { paddingLeft: 38 },
  pdToggle: {
    flexDirection: 'row',
    backgroundColor: '#F2EFE9',
    borderRadius: 10,
    padding: 3,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(44,40,32,0.06)',
  },
  pdTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pdTabActive: { backgroundColor: '#fff' },
  pdTabText: { fontSize: 13, color: '#6B6560', fontWeight: '700' },
  pdTabTextActive: { color: '#4E9A94' },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1 },
  fieldHint: { fontSize: 11, color: '#A09890', lineHeight: 16, marginTop: 6 },
  divider: { height: 1, backgroundColor: 'rgba(44,40,32,0.06)', marginHorizontal: -16 },

  help: { fontSize: 12 },
  metaText: { fontSize: 11, color: '#A09890', paddingHorizontal: 2 },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(44,40,32,0.12)',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: 'rgba(242,239,233,0.92)',
  },
  submitBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: '#4E9A94',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
});
