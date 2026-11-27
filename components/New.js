// components/New.js
// Liga Nacional GT
//
// Noticias oficiales desde:
// https://liganacionalgt.com/
//
// Funcionamiento:
// - Sin parámetros: muestra listado de noticias.
// - Con route.params.notice: abre directamente la noticia.
// - Las noticias se obtienen del REST API de WordPress.
// - Al tocar una noticia, se abre dentro de la misma pantalla.

import React, {
  Component,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  WebView,
} from 'react-native-webview';

import Header from './Header';

import {
  BRAND,
} from '../utils/theme';


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const SITE_URL =
  'https://liganacionalgt.com';

const NEWS_API =
  `${SITE_URL}/wp-json/wp/v2/posts?_embed=1&per_page=20`;

const FALLBACK_IMAGE =
  null;


/* =========================================================
   HELPERS
========================================================= */

function decodeHtml(
  value = '',
) {
  return String(
    value || '',
  )
    .replace(
      /&#8211;/g,
      '–',
    )
    .replace(
      /&#8212;/g,
      '—',
    )
    .replace(
      /&#8216;/g,
      '‘',
    )
    .replace(
      /&#8217;/g,
      '’',
    )
    .replace(
      /&#8220;/g,
      '“',
    )
    .replace(
      /&#8221;/g,
      '”',
    )
    .replace(
      /&#038;/g,
      '&',
    )
    .replace(
      /&amp;/g,
      '&',
    )
    .replace(
      /&quot;/g,
      '"',
    )
    .replace(
      /&#039;/g,
      "'",
    )
    .replace(
      /&nbsp;/g,
      ' ',
    )
    .replace(
      /<[^>]*>/g,
      '',
    )
    .trim();
}


function getNoticeTitle(
  notice,
) {
  if (
    notice?.title?.rendered
  ) {
    return decodeHtml(
      notice.title.rendered,
    );
  }


  if (
    typeof notice?.title ===
    'string'
  ) {
    return decodeHtml(
      notice.title,
    );
  }


  return 'Noticia';
}


function getNoticeExcerpt(
  notice,
) {
  if (
    notice?.excerpt?.rendered
  ) {
    return decodeHtml(
      notice.excerpt.rendered,
    );
  }


  if (
    typeof notice?.excerpt ===
    'string'
  ) {
    return decodeHtml(
      notice.excerpt,
    );
  }


  return '';
}


function getNoticeUrl(
  notice,
) {
  return (
    notice?.link ||
    notice?.url ||
    ''
  );
}


function getFeaturedImage(
  notice,
) {
  const media =
    notice?._embedded?.[
      'wp:featuredmedia'
    ]?.[0];


  if (!media) {
    return (
      notice?.featured_image ||
      notice?.image ||
      null
    );
  }


  return (
    media?.media_details
      ?.sizes
      ?.medium_large
      ?.source_url ||

    media?.media_details
      ?.sizes
      ?.large
      ?.source_url ||

    media?.media_details
      ?.sizes
      ?.medium
      ?.source_url ||

    media?.source_url ||

    null
  );
}


function formatDate(
  value,
) {
  if (!value) {
    return '';
  }


  try {
    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return '';
    }


    return date.toLocaleDateString(
      'es-GT',
      {
        day:
          'numeric',

        month:
          'long',

        year:
          'numeric',
      },
    );

  } catch (error) {
    return '';
  }
}


/* =========================================================
   IMAGEN NOTICIA
========================================================= */

function NewsImage({
  uri,
}) {
  const [
    failed,
    setFailed,
  ] =
    React.useState(false);


  React.useEffect(
    () => {
      setFailed(false);
    },
    [
      uri,
    ],
  );


  if (
    uri &&
    !failed
  ) {
    return (
      <Image
        source={{
          uri,
        }}

        resizeMode="cover"

        style={
          styles.newsImage
        }

        onError={
          () =>
            setFailed(true)
        }
      />
    );
  }


  return (
    <View
      style={[
        styles.newsImage,
        styles.newsImageFallback,
      ]}
    >
      <Text
        style={
          styles.newsImageFallbackIcon
        }
      >
        ⚽
      </Text>
    </View>
  );
}


/* =========================================================
   CARD
========================================================= */

function NewsCard({
  item,
  onPress,
}) {
  const title =
    getNoticeTitle(
      item,
    );


  const excerpt =
    getNoticeExcerpt(
      item,
    );


  const image =
    getFeaturedImage(
      item,
    );


  const date =
    formatDate(
      item?.date,
    );


  return (
    <TouchableOpacity
      activeOpacity={0.82}

      onPress={
        onPress
      }

      style={
        styles.newsCard
      }
    >

      <NewsImage
        uri={
          image ||
          FALLBACK_IMAGE
        }
      />


      <View
        style={
          styles.newsCardBody
        }
      >

        {!!date && (
          <Text
            style={
              styles.newsDate
            }
          >
            {date}
          </Text>
        )}


        <Text
          numberOfLines={3}

          style={
            styles.newsTitle
          }
        >
          {title}
        </Text>


        {!!excerpt && (
          <Text
            numberOfLines={2}

            style={
              styles.newsExcerpt
            }
          >
            {excerpt}
          </Text>
        )}


        <View
          style={
            styles.readRow
          }
        >
          <Text
            style={
              styles.readText
            }
          >
            Leer noticia
          </Text>

          <Text
            style={
              styles.readArrow
            }
          >
            ›
          </Text>
        </View>

      </View>

    </TouchableOpacity>
  );
}


/* =========================================================
   SCREEN
========================================================= */

export default class New extends Component {

  constructor(props) {
    super(props);


    const incomingNotice =
      props?.route
        ?.params
        ?.notice ||
      null;


    this.state = {
      news: [],

      selectedNotice:
        incomingNotice,

      loading:
        !incomingNotice,

      refreshing:
        false,

      error:
        '',
    };
  }


  componentDidMount() {
    if (
      !this.state
        .selectedNotice
    ) {
      this.loadNews();
    }
  }


  componentDidUpdate(
    prevProps,
  ) {
    const previousNotice =
      prevProps?.route
        ?.params
        ?.notice ||
      null;


    const currentNotice =
      this.props?.route
        ?.params
        ?.notice ||
      null;


    if (
      previousNotice !==
        currentNotice &&
      currentNotice
    ) {
      this.setState({
        selectedNotice:
          currentNotice,
      });
    }
  }


  /* =======================================================
     CARGAR NOTICIAS
  ======================================================= */

  loadNews =
    async ({
      refresh =
        false,
    } = {}) => {

      if (refresh) {
        this.setState({
          refreshing:
            true,

          error:
            '',
        });

      } else {
        this.setState({
          loading:
            true,

          error:
            '',
        });
      }


      try {
        const response =
          await fetch(
            NEWS_API,
            {
              method:
                'GET',

              headers: {
                Accept:
                  'application/json',
              },
            },
          );


        if (
          !response.ok
        ) {
          throw new Error(
            `HTTP ${response.status}`,
          );
        }


        const payload =
          await response.json();


        const news =
          Array.isArray(
            payload,
          )
            ? payload
            : [];


        this.setState({
          news,

          error:
            '',
        });


      } catch (error) {
        console.warn(
          '[News]',
          error?.message ||
          error,
        );


        this.setState({
          error:
            'No se pudieron cargar las noticias.',
        });


      } finally {
        this.setState({
          loading:
            false,

          refreshing:
            false,
        });
      }
    };


  refresh =
    () => {
      this.loadNews({
        refresh:
          true,
      });
    };


  /* =======================================================
     ABRIR NOTICIA
  ======================================================= */

  openNotice =
    notice => {

      if (!notice) {
        return;
      }


      this.setState({
        selectedNotice:
          notice,
      });
    };


  closeNotice =
    () => {

      this.setState({
        selectedNotice:
          null,
      });


      if (
        !this.state
          .news
          .length
      ) {
        this.loadNews();
      }
    };


  /* =======================================================
     LINK EXTERNO
  ======================================================= */

  openExternal =
    async url => {

      if (!url) {
        return;
      }


      try {
        const supported =
          await Linking.canOpenURL(
            url,
          );


        if (supported) {
          await Linking.openURL(
            url,
          );
        }

      } catch (error) {
        console.warn(
          '[News external]',
          error,
        );
      }
    };


  /* =======================================================
     DETALLE
  ======================================================= */

  renderDetail() {
    const {
      selectedNotice,
    } =
      this.state;


    const url =
      getNoticeUrl(
        selectedNotice,
      );


    const title =
      getNoticeTitle(
        selectedNotice,
      );


    if (!url) {
      return null;
    }


    return (
      <View
        style={
          styles.detailScreen
        }
      >

        <View
          style={
            styles.detailHeader
          }
        >

          <TouchableOpacity
            activeOpacity={0.7}

            onPress={
              this.closeNotice
            }

            style={
              styles.backButton
            }
          >
            <Text
              style={
                styles.backArrow
              }
            >
              ‹
            </Text>
          </TouchableOpacity>


          <Text
            numberOfLines={2}

            style={
              styles.detailTitle
            }
          >
            {title}
          </Text>


          <View
            style={
              styles.backButtonPlaceholder
            }
          />

        </View>


        <WebView
          ref={
            ref => {
              this.WebView =
                ref;
            }
          }

          source={{
            uri:
              url,
          }}

          startInLoadingState

          javaScriptEnabled

          domStorageEnabled

          allowsBackForwardNavigationGestures

          renderLoading={
            () => (
              <View
                style={
                  styles.webLoading
                }
              >
                <ActivityIndicator
                  size="large"

                  color={
                    BRAND.primary
                  }
                />
              </View>
            )
          }

          onShouldStartLoadWithRequest={
            request => {

              const nextUrl =
                request?.url ||
                '';


              if (!nextUrl) {
                return false;
              }


              /*
               * Permitimos navegación
               * dentro de LigaNacionalGT.
               */
              if (
                nextUrl.includes(
                  'liganacionalgt.com',
                ) ||
                nextUrl ===
                  'about:blank'
              ) {
                return true;
              }


              /*
               * Links externos:
               * navegador del dispositivo.
               */
              this.openExternal(
                nextUrl,
              );


              return false;
            }
          }

          style={
            styles.webView
          }
        />

      </View>
    );
  }


  /* =======================================================
     HEADER LISTADO
  ======================================================= */

  renderListHeader() {
    return (
      <View
        style={
          styles.intro
        }
      >

        <View
          style={
            styles.introIcon
          }
        >
          <Text
            style={
              styles.introIconText
            }
          >
            ▤
          </Text>
        </View>


        <View
          style={
            styles.introTextWrap
          }
        >
          <Text
            style={
              styles.pageTitle
            }
          >
            Noticias
          </Text>

          <Text
            style={
              styles.pageSubtitle
            }
          >
            Últimas noticias de la Liga Nacional
          </Text>
        </View>

      </View>
    );
  }


  /* =======================================================
     EMPTY
  ======================================================= */

  renderEmpty() {
    return (
      <View
        style={
          styles.empty
        }
      >

        <Text
          style={
            styles.emptyIcon
          }
        >
          ⚽
        </Text>


        <Text
          style={
            styles.emptyTitle
          }
        >
          No hay noticias disponibles
        </Text>


        <Text
          style={
            styles.emptyText
          }
        >
          Las publicaciones del sitio aparecerán aquí automáticamente.
        </Text>

      </View>
    );
  }


  /* =======================================================
     ERROR
  ======================================================= */

  renderError() {
    return (
      <View
        style={
          styles.center
        }
      >

        <Text
          style={
            styles.errorIcon
          }
        >
          ⚽
        </Text>


        <Text
          style={
            styles.errorTitle
          }
        >
          No se pudieron cargar
        </Text>


        <Text
          style={
            styles.errorText
          }
        >
          Revisa la conexión e intenta nuevamente.
        </Text>


        <TouchableOpacity
          activeOpacity={0.8}

          onPress={
            () =>
              this.loadNews()
          }

          style={
            styles.retryButton
          }
        >
          <Text
            style={
              styles.retryText
            }
          >
            Reintentar
          </Text>
        </TouchableOpacity>

      </View>
    );
  }


  /* =======================================================
     RENDER
  ======================================================= */

  render() {
    const {
      navigation,
    } =
      this.props;


    const {
      news,
      selectedNotice,
      loading,
      refreshing,
      error,
    } =
      this.state;


    /*
     * Si hay noticia seleccionada,
     * mostramos lector.
     */
    if (
      selectedNotice
    ) {
      return (
        <SafeAreaView
          style={
            styles.container
          }
        >
          {this.renderDetail()}
        </SafeAreaView>
      );
    }


    return (
      <SafeAreaView
        style={
          styles.container
        }
      >

        <Header
          navigation={
            navigation
          }
        />


        {loading ? (

          <View
            style={
              styles.center
            }
          >

            <ActivityIndicator
              size="large"

              color={
                BRAND.primary
              }
            />


            <Text
              style={
                styles.loadingText
              }
            >
              Cargando noticias…
            </Text>

          </View>

        ) : error &&
          !news.length ? (

          this.renderError()

        ) : (

          <FlatList
            data={
              news
            }

            keyExtractor={
              (
                item,
                index,
              ) =>
                String(
                  item?.id ||
                  `news-${index}`,
                )
            }

            renderItem={
              ({
                item,
              }) => (
                <NewsCard
                  item={
                    item
                  }

                  onPress={
                    () =>
                      this.openNotice(
                        item,
                      )
                  }
                />
              )
            }

            ListHeaderComponent={
              this.renderListHeader()
            }

            ListEmptyComponent={
              this.renderEmpty()
            }

            showsVerticalScrollIndicator={
              false
            }

            contentContainerStyle={
              styles.listContent
            }

            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }

                onRefresh={
                  this.refresh
                }

                colors={[
                  BRAND.primary,
                ]}

                tintColor={
                  BRAND.primary
                }
              />
            }
          />

        )}

      </SafeAreaView>
    );
  }
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    container: {
      flex:
        1,

      backgroundColor:
        '#F6F9FE',

      paddingTop:
        Platform.OS ===
        'ios'
          ? 0
          : 0,
    },


    listContent: {
      paddingHorizontal:
        14,

      paddingBottom:
        30,
    },


    /* =====================================================
       INTRO
    ===================================================== */

    intro: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingTop:
        18,

      paddingBottom:
        16,
    },


    introIcon: {
      width:
        48,

      height:
        48,

      borderRadius:
        15,

      backgroundColor:
        '#EEF4FF',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        11,
    },


    introIconText: {
      color:
        BRAND.primary,

      fontSize:
        25,

      fontFamily:
        'Poppins-Bold',

      includeFontPadding:
        false,
    },


    introTextWrap: {
      flex:
        1,
    },


    pageTitle: {
      color:
        '#111B50',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        23,

      lineHeight:
        28,

      includeFontPadding:
        false,
    },


    pageSubtitle: {
      marginTop:
        1,

      color:
        '#8590AD',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        11,

      lineHeight:
        16,

      includeFontPadding:
        false,
    },


    /* =====================================================
       CARD
    ===================================================== */

    newsCard: {
      backgroundColor:
        '#FFFFFF',

      borderRadius:
        18,

      overflow:
        'hidden',

      marginBottom:
        14,

      borderWidth:
        StyleSheet.hairlineWidth,

      borderColor:
        '#E4EBF5',

      shadowColor:
        '#1B3264',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.07,

      shadowRadius:
        9,

      elevation:
        2,
    },


    newsImage: {
      width:
        '100%',

      height:
        170,

      backgroundColor:
        '#EDF3FC',
    },


    newsImageFallback: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },


    newsImageFallbackIcon: {
      fontSize:
        36,
    },


    newsCardBody: {
      paddingHorizontal:
        15,

      paddingTop:
        12,

      paddingBottom:
        13,
    },


    newsDate: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9,

      lineHeight:
        13,

      marginBottom:
        4,

      textTransform:
        'capitalize',
    },


    newsTitle: {
      color:
        '#111B50',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        15,

      lineHeight:
        21,

      includeFontPadding:
        false,
    },


    newsExcerpt: {
      marginTop:
        5,

      color:
        '#727E9D',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        10.5,

      lineHeight:
        16,
    },


    readRow: {
      marginTop:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    readText: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        10.5,
    },


    readArrow: {
      marginLeft:
        5,

      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        18,

      lineHeight:
        19,
    },


    /* =====================================================
       DETALLE
    ===================================================== */

    detailScreen: {
      flex:
        1,

      backgroundColor:
        '#FFFFFF',
    },


    detailHeader: {
      minHeight:
        62,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#FFFFFF',

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        '#E8ECF3',

      paddingHorizontal:
        10,
    },


    backButton: {
      width:
        42,

      height:
        42,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    backArrow: {
      color:
        '#172352',

      fontSize:
        34,

      lineHeight:
        36,

      fontFamily:
        'Poppins-Regular',

      includeFontPadding:
        false,
    },


    backButtonPlaceholder: {
      width:
        42,
    },


    detailTitle: {
      flex:
        1,

      color:
        '#111B50',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        11,

      lineHeight:
        16,

      textAlign:
        'center',
    },


    webView: {
      flex:
        1,

      backgroundColor:
        '#FFFFFF',
    },


    webLoading: {
      position:
        'absolute',

      left:
        0,

      right:
        0,

      top:
        0,

      bottom:
        0,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FFFFFF',
    },


    /* =====================================================
       ESTADOS
    ===================================================== */

    center: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
    },


    loadingText: {
      marginTop:
        10,

      color:
        '#7C87A4',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        11,
    },


    errorIcon: {
      fontSize:
        32,

      marginBottom:
        8,
    },


    errorTitle: {
      color:
        '#111B50',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        17,
    },


    errorText: {
      marginTop:
        5,

      color:
        '#7D88A5',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        11,

      textAlign:
        'center',
    },


    retryButton: {
      marginTop:
        17,

      backgroundColor:
        BRAND.primary,

      paddingHorizontal:
        20,

      paddingVertical:
        10,

      borderRadius:
        13,
    },


    retryText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        11,
    },


    empty: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingTop:
        70,

      paddingHorizontal:
        25,
    },


    emptyIcon: {
      fontSize:
        32,
    },


    emptyTitle: {
      marginTop:
        10,

      color:
        '#111B50',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        14,
    },


    emptyText: {
      marginTop:
        5,

      color:
        '#7D88A5',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        10.5,

      lineHeight:
        16,

      textAlign:
        'center',
    },

  });