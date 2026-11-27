// components/ActiveNotifications.js
import React, { Component } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackActions }  from "@react-navigation/native";
import { withTheme }     from "../utils/ThemeContext";
import { BRAND }         from "../utils/theme";

const { width } = Dimensions.get("window");

/* ─── Íconos/ilustración ─────────────────────────────────── */
const BELL_ICON = require("../resources/bell.png");
const LOGO_SRC  = require("../resources/logos/app-logo.png");

/* ══════════════════════════════════════════════════════════
   ACTIVE NOTIFICATIONS — pantalla de onboarding
══════════════════════════════════════════════════════════ */
class ActiveNotifications extends Component {
  /* Animaciones de entrada */
  logoAnim  = new Animated.Value(0);
  cardAnim  = new Animated.Value(0);
  btnAnim   = new Animated.Value(0);

  componentDidMount() {
    Animated.stagger(120, [
      Animated.spring(this.logoAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(this.cardAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(this.btnAnim,  { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start();
  }

  handleActivate = () => {
    if (Platform.OS === "ios") {
      /* En iOS hay que pedir permiso explícito — aquí iría la lógica
         de PushNotification.requestPermissions() cuando esté disponible */
    }
    /* Volver al inicio */
    this.props.navigation?.dispatch?.(StackActions.popToTop());
  };

  handleLater = () => {
    this.props.navigation?.dispatch?.(StackActions.popToTop());
  };

  render() {
    const { theme } = this.props;
    const colors    = theme?.colors ?? {};
    const isDark    = theme?.mode === "dark";

    const logoStyle = {
      opacity:   this.logoAnim,
      transform: [{ scale: this.logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
    };
    const cardStyle = {
      opacity:   this.cardAnim,
      transform: [{ translateY: this.cardAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
    };
    const btnStyle  = {
      opacity:   this.btnAnim,
      transform: [{ translateY: this.btnAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
    };

    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.screenBg }]} edges={["top", "bottom"]}>
        <View style={styles.inner}>

          {/* ── Logo + branding ── */}
          <Animated.View style={[styles.logoWrap, logoStyle]}>
            <Image source={LOGO_SRC} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.appName, { color: colors.text }]}>Liga Nacional GT</Text>
            <Text style={[styles.appSub, { color: colors.textMuted }]}>🇬🇹 Guatemala</Text>
          </Animated.View>

          {/* ── Card de permisos ── */}
          <Animated.View style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            cardStyle,
          ]}>
            {/* Ícono de campana */}
            <View style={[styles.bellWrap, { backgroundColor: isDark ? `${BRAND.primary}22` : `${BRAND.primary}12` }]}>
              <Image source={BELL_ICON} style={[styles.bellIcon, { tintColor: BRAND.primary }]} />
            </View>

            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Activa las notificaciones
            </Text>

            <Text style={[styles.cardBody, { color: colors.textMuted }]}>
              Recibe alertas en tiempo real cuando empiezan los partidos, goles y resultados finales de la Liga Nacional.
            </Text>

            {/* Beneficios */}
            {[
              "⚽  Goles al instante",
              "🕐  Aviso antes del partido",
              "📋  Resultado final",
            ].map(line => (
              <View key={line} style={[styles.benefitRow, { borderTopColor: colors.cardBorder }]}>
                <Text style={[styles.benefitText, { color: colors.text }]}>{line}</Text>
              </View>
            ))}
          </Animated.View>

          {/* ── Botones ── */}
          <Animated.View style={[styles.actions, btnStyle]}>
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: BRAND.primary }]}
              activeOpacity={0.8}
              onPress={this.handleActivate}
            >
              <Text style={styles.btnPrimaryText}>Activar notificaciones</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              activeOpacity={0.6}
              onPress={this.handleLater}
            >
              <Text style={[styles.btnSecondaryText, { color: colors.textMuted }]}>
                Ahora no
              </Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </SafeAreaView>
    );
  }
}

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },

  /* Logo */
  logoWrap: { alignItems: "center", gap: 6 },
  logo:     { width: 64, height: 64 },
  appName:  { fontFamily: "Poppins-Bold", fontSize: 18, letterSpacing: -0.3 },
  appSub:   { fontFamily: "Poppins-Regular", fontSize: 12 },

  /* Card */
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  bellWrap: {
    width: 64, height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bellIcon: { width: 30, height: 30, resizeMode: "contain" },

  cardTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 18,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  cardBody: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  /* Beneficios */
  benefitRow: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    alignItems: "flex-start",
  },
  benefitText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
  },

  /* Botones */
  actions: { width: "100%", gap: 10, alignItems: "center" },
  btnPrimary: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    fontFamily: "Poppins-Bold",
    fontSize: 15,
    color: "#fff",
    letterSpacing: 0.2,
  },
  btnSecondary:     { paddingVertical: 8, paddingHorizontal: 16 },
  btnSecondaryText: { fontFamily: "Poppins-SemiBold", fontSize: 13, textDecorationLine: "underline" },
});

export default withTheme(ActiveNotifications);