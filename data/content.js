// Contenido del juego "Ruta Nómade: Camino al Millón"
// Todas las cifras fueron balanceadas para que una partida "perfecta" (8 decisiones
// correctas) llegue cómodo a la meta de valor de mercado ($1.000.000) mientras la
// caja queda ajustada pero positiva. Ver README para el detalle del balance.

const STARTING_CASH = 30000;
const STARTING_VALUE = 50000;
const GOAL_VALUE = 1000000;

const BRIEFING = {
  title: 'Ruta Nómade',
  subtitle: 'Camino al Millón',
  story: [
    'Heredé esta cafetería de mis padres. Durante 5 años la sostuve en equilibrio: no perdíamos plata, pero tampoco crecíamos.',
    'El problema es que el mundo ya no es el que ellos conocían: todo se volvió digital de la noche a la mañana, y seguir haciendo las cosas igual que siempre ya no alcanza.',
    'Hoy ustedes son mi junta directiva de marketing. De sus decisiones depende si Ruta Nómade se convierte en un caso de éxito, se queda estancada, o quiebra.'
  ]
};

// type: 'correct' | 'incorrect' | 'neutral'
const DECISIONS = [
  {
    theme: 'Consumidor híbrido',
    title: 'El cliente ya no elige un solo canal',
    scenario: 'Han pasado 5 años desde que abrieron el primer local de Ruta Nómade. El mundo se volvió digital de golpe y las ventas en tienda física se estancaron. El equipo de marketing debate cómo lanzar la nueva estrategia de canales.',
    options: [
      {
        text: 'Lanzar una estrategia omnicanal: mismo mensaje y promociones en app, redes y tienda física, con un recorrido de compra fluido entre los tres.',
        type: 'correct',
        explanation: 'El consumidor híbrido no elige entre digital y físico: usa ambos en la misma compra. Una estrategia integrada evita perderlo en el camino.',
        cash: -4500,
        valorPct: 60
      },
      {
        text: 'Mover todo el presupuesto de marketing a redes sociales y dejar de comunicar nada en tienda física.',
        type: 'incorrect',
        explanation: 'Ignora que parte del público sigue comprando en tienda física. La marca pierde consistencia entre canales y desconecta una parte de su recorrido.',
        cash: 4000,
        valorPct: -20
      },
      {
        text: 'Seguir con la misma campaña de volantes y radio local de siempre, sin adaptarse a nada nuevo.',
        type: 'neutral',
        explanation: 'No arriesga nada, pero tampoco resuelve el estancamiento.',
        cash: 1000,
        valorPct: -2
      }
    ]
  },
  {
    theme: 'Consumidor híbrido',
    title: 'De Instagram al carrito de compra',
    scenario: 'Marketing detecta que muchos clientes descubren Ruta Nómade en Instagram, pero terminan comprando por una app de delivery externa, sin dejar ningún dato de contacto propio.',
    options: [
      {
        text: 'Integrar compra directa en redes sociales (social commerce) y mantener presencia en el marketplace, cuidando la experiencia en ambos.',
        type: 'correct',
        explanation: 'Recorta la fricción entre descubrir y comprar, sin abandonar el canal donde el cliente ya confía.',
        cash: -3000,
        valorPct: 50
      },
      {
        text: 'Prohibir que el equipo publique en redes sociales, para "obligar" a la gente a ir directo a la tienda física.',
        type: 'incorrect',
        explanation: 'Vuelve invisible a la marca justo donde el cliente la está descubriendo hoy.',
        cash: -4000,
        valorPct: -25
      },
      {
        text: 'Seguir publicando fotos bonitas del café en redes, sin ningún botón de compra ni llamado a la acción.',
        type: 'neutral',
        explanation: 'Genera algo de presencia, pero desaprovecha el momento en que el cliente está listo para comprar.',
        cash: 0,
        valorPct: -3
      }
    ]
  },
  {
    theme: 'IA generativa en marketing',
    title: 'El copiloto o el actor invisible',
    scenario: 'Un proveedor ofrece instalar un asistente de IA generativa que puede escribir toda la publicidad y recomendar bebidas personalizadas a cada cliente.',
    options: [
      {
        text: 'Usar la IA para personalizar recomendaciones, comunicando abiertamente que se usa IA y cómo se protegen los datos del cliente.',
        type: 'correct',
        explanation: 'Explicar el uso de IA y el manejo de datos reduce incertidumbre y permite que el cliente decida con información clara.',
        cash: -2000,
        valorPct: 55
      },
      {
        text: 'Usar la IA para generar testimonios y reseñas de clientes que nunca existieron, sin avisar que es contenido artificial.',
        type: 'incorrect',
        explanation: 'Cuando se descubre, el daño a la confianza es mucho mayor que cualquier ganancia de corto plazo.',
        cash: 6000,
        valorPct: -30
      },
      {
        text: 'No usar IA en marketing todavía, seguir con los mismos anuncios genéricos para todo el público.',
        type: 'neutral',
        explanation: 'Evita el riesgo, pero se queda fuera de una herramienta que ya usa la competencia.',
        cash: 2000,
        valorPct: -4
      }
    ]
  },
  {
    theme: 'IA generativa en marketing',
    title: '¿Quién aprueba lo que publica la marca?',
    scenario: 'La IA generativa ya puede escribir automáticamente el 100% del contenido de redes sociales de Ruta Nómade, sin que nadie del equipo lo revise antes de publicar.',
    options: [
      {
        text: 'Usar la IA como copiloto: genera los borradores, pero el equipo humano revisa, ajusta el tono de marca y aprueba antes de publicar.',
        type: 'correct',
        explanation: 'Combina la velocidad de la IA con el criterio humano.',
        cash: -1500,
        valorPct: 50
      },
      {
        text: 'Publicar el 100% del contenido generado por IA en automático, sin ninguna revisión editorial.',
        type: 'incorrect',
        explanation: 'El contenido se vuelve genérico y la audiencia lo nota rápido.',
        cash: 5000,
        valorPct: -22
      },
      {
        text: 'Seguir escribiendo absolutamente todo a mano, sin usar IA ni para generar ideas.',
        type: 'neutral',
        explanation: 'No hay riesgo de contenido genérico, pero el equipo pierde velocidad.',
        cash: -1000,
        valorPct: -3
      }
    ]
  },
  {
    theme: 'Comunidades de marca',
    title: 'Una sola apuesta este trimestre',
    scenario: 'El equipo de marketing tiene presupuesto para UNA sola apuesta grande: construir una comunidad real de clientes frecuentes, o comprar más anuncios pagados.',
    options: [
      {
        text: 'Invertir en una comunidad real (grupo cerrado con beneficios exclusivos y respuestas personalizadas a cada miembro).',
        type: 'correct',
        explanation: 'Una comunidad activa reduce el costo de conseguir nuevos clientes, porque los propios miembros recomiendan la marca.',
        cash: -4500,
        valorPct: 60
      },
      {
        text: 'Gastar todo el presupuesto en anuncios pagados masivos, sin construir ninguna relación con la audiencia.',
        type: 'incorrect',
        explanation: 'Compra alcance de corto plazo, pero no crea un vínculo ni una razón para que el cliente vuelva por iniciativa propia.',
        cash: -14000,
        valorPct: -18
      },
      {
        text: 'No hacer ninguna apuesta nueva, mantener solo la cuenta de Instagram sin estrategia de comunidad.',
        type: 'neutral',
        explanation: 'Ahorra dinero, pero deja sin trabajar una palanca importante de fidelización: la relación continua con clientes frecuentes.',
        cash: 1000,
        valorPct: -2
      }
    ]
  },
  {
    theme: 'Comunidades de marca',
    title: 'El microinfluencer vs. la gran estrella',
    scenario: 'Un creador de contenido local, con poca audiencia pero muy fiel, ofrece una colaboración auténtica y barata. También llega la oferta de un influencer masivo, caro y genérico.',
    options: [
      {
        text: 'Colaborar con el creador local: contenido auténtico, cercano y creíble para su comunidad.',
        type: 'correct',
        explanation: 'Cuando la audiencia y la marca encajan, el contenido auténtico suele ser más creíble y eficiente que comprar alcance genérico.',
        cash: -1000,
        valorPct: 50
      },
      {
        text: 'Pagar al influencer masivo solo por su número de seguidores, sin verificar si su audiencia coincide con la marca.',
        type: 'incorrect',
        explanation: 'Gran parte del presupuesto se va en alcance que no convierte.',
        cash: -16000,
        valorPct: -20
      },
      {
        text: 'No colaborar con nadie y seguir haciendo todo el marketing internamente.',
        type: 'neutral',
        explanation: 'No hay gasto ni riesgo, pero tampoco hay ninguna voz nueva que hable bien de la marca.',
        cash: 3000,
        valorPct: -3
      }
    ]
  },
  {
    theme: 'Economía de la confianza',
    title: 'La pregunta incómoda de la prensa',
    scenario: 'Un medio local pregunta directamente a Ruta Nómade si las fotos de producto que se ven en redes sociales fueron generadas con inteligencia artificial.',
    options: [
      {
        text: 'Responder con transparencia total: explicar exactamente qué partes usan IA y cuáles no.',
        type: 'correct',
        explanation: 'La transparencia reduce la incertidumbre: permite explicar qué se generó con IA, qué supervisó el equipo y por qué.',
        cash: -500,
        valorPct: 60
      },
      {
        text: 'Negarlo públicamente, aunque no sea del todo cierto.',
        type: 'incorrect',
        explanation: 'Cuando la mentira se descubre, el daño es mucho mayor que haber dicho la verdad desde el principio.',
        cash: 3000,
        valorPct: -35
      },
      {
        text: 'No confirmar ni negar nada, y cambiar de tema en la entrevista.',
        type: 'neutral',
        explanation: 'Evita el escándalo inmediato, pero la falta de claridad también erosiona la confianza.',
        cash: 0,
        valorPct: -6
      }
    ]
  },
  {
    theme: 'Economía de la confianza',
    title: 'La oferta que pone a prueba los valores de la marca',
    scenario: 'Una empresa de datos ofrece comprar el historial de compras y la ubicación de los clientes de Ruta Nómade por una cifra muy alta.',
    options: [
      {
        text: 'Rechazar la venta y lanzar, en cambio, una campaña mostrando con claridad la política de privacidad y el control que cada cliente tiene sobre sus datos.',
        type: 'correct',
        explanation: 'Una política clara de privacidad convierte el cuidado de datos en una señal de confianza y en un diferencial de marca.',
        cash: -3000,
        valorPct: 65
      },
      {
        text: 'Vender los datos de los clientes sin avisarles.',
        type: 'incorrect',
        explanation: 'El ingreso es grande y rápido, pero vender datos sin consentimiento puede destruir la confianza y exponer a la marca a sanciones.',
        cash: 22000,
        valorPct: -40
      },
      {
        text: 'No vender los datos, pero tampoco comunicar nada al respecto.',
        type: 'neutral',
        explanation: 'Se evita el escándalo, pero se pierde la oportunidad de convertir la transparencia en un diferencial de marca.',
        cash: 2000,
        valorPct: -5
      }
    ]
  }
];

const EVENTS = [
  {
    icon: '📉',
    title: 'Cambio de algoritmo',
    description: 'Instagram cambia su algoritmo de la noche a la mañana y el alcance orgánico de todas las marcas cae en picada.',
    cash: -3000,
    valorPct: -8
  },
  {
    icon: '🎥',
    title: 'Momento viral inesperado',
    description: 'Un cliente sube un video espontáneo mostrando su experiencia en Ruta Nómade y se vuelve viral en cuestión de horas.',
    cash: 5000,
    valorPct: 38
  },
  {
    icon: '🛡️',
    title: 'Alerta de ciberseguridad global',
    description: 'Un ciberataque a gran escala genera desconfianza masiva hacia todas las apps, incluida la de Ruta Nómade.',
    cash: -2500,
    valorPct: -10
  },
  {
    icon: '🤖',
    title: 'El competidor tropieza',
    description: 'Un competidor es descubierto usando reseñas falsas generadas por IA. El público empieza a valorar más a las marcas transparentes.',
    cash: 1000,
    valorPct: 35
  },
  {
    icon: '💸',
    title: 'La publicidad digital se encarece',
    description: 'El costo de la publicidad digital se dispara por la altísima demanda de la temporada.',
    cash: -3500,
    valorPct: -5
  },
  {
    icon: '🔍',
    title: 'Un algoritmo los descubre',
    description: 'El algoritmo de recomendaciones de un marketplace empieza a mostrar Ruta Nómade a miles de nuevos clientes, totalmente gratis.',
    cash: 6000,
    valorPct: 37
  }
];

// Posiciones (0-indexed, después de cuántas decisiones resueltas) donde se inserta
// un evento: después de ronda 2, después de ronda 4, después de ronda 6.
const EVENT_SLOTS_AFTER_DECISION = [2, 4, 6];

module.exports = {
  STARTING_CASH,
  STARTING_VALUE,
  GOAL_VALUE,
  BRIEFING,
  DECISIONS,
  EVENTS,
  EVENT_SLOTS_AFTER_DECISION
};
