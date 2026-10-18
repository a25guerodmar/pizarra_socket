<script setup>
import { ref, nextTick } from 'vue'
import {io} from 'socket.io-client'

const socket = io('http://localhost:40302')
socket.on('draw_begin', function(datos) {
    if (datos.roomName === salaActual.value) {
        recibirInicio(datos)
    }
})

socket.on('draw_move', function(datos) {
    if (datos.roomName === salaActual.value) {
        recibirMovimiento(datos)
    }
})
socket.on('draw_end', function(datos) {
    if (datos.roomName === salaActual.value) {
        contexto.beginPath()
    }
})
socket.on('cargar_dibujos', function(dibujos) {
    if (contexto) {
        contexto.clearRect(0, 0, 800, 450)

        dibujos.forEach(function(dibujo) {
            if (dibujo.tipo === 'inicio') {
                contexto.beginPath()
                contexto.strokeStyle = dibujo.color
                contexto.moveTo(dibujo.x, dibujo.y)
            } else {
                contexto.strokeStyle = dibujo.color
                contexto.lineTo(dibujo.x, dibujo.y)
                contexto.stroke()
            }
        })
    }
})
socket.on('cursor:mover', function(datos) {
    if (datos.roomName === salaActual.value) {
        const cursor = cursores.value.find(c => c.id === datos.id)

        if (cursor) {
            cursor.x = datos.x
            cursor.y = datos.y
            cursor.color = datos.color
        } else {
            cursores.value.push({
                id: datos.id,
                nombre: datos.nombre,
                color: datos.color,
                x: datos.x,
                y: datos.y
            })
        }
    }
})
const nombre = ref('')
const haEntrado = ref(false)
const nombreSalaCrear = ref('')
const nombreSalaUnir = ref('')
const salaActual = ref('')
const cursores = ref([])
const colores = [
    'red',
    'blue',
    'green',
    'orange',
    'purple',
    'deeppink',
    'brown',
    'teal'
]
const miColor = colores[Math.floor(Math.random() * colores.length)]
const pizarra = ref(null)
let contexto = null
let dibujando = false

function entrar() {
  if(nombre.value.trim() !== '') {
    haEntrado.value = true
  } else {
    alert('Escribe tu nombre antes de entrar')
  }
}

function crearSala() {
  if (nombreSalaCrear.value.trim() !== '') {
    salaActual.value = nombreSalaCrear.value.trim()
    socket.emit('join_room', {
        roomName: salaActual.value,
        username: nombre.value,
        color: miColor
    })
    prepararPizarra()
  } else {
    alert('Escribe un nombre para la sala')
  }
}

function unirseSala() {
  if (nombreSalaUnir.value.trim() !== '') {
    salaActual.value = nombreSalaUnir.value.trim()
    socket.emit('join_room', {
        roomName: salaActual.value,
        username: nombre.value,
        color: miColor
    })
    prepararPizarra()
  } else {
    alert('Escribe el nombre de una sala')
  }
}

async function prepararPizarra() {
  await nextTick()
  if(pizarra.value) {
    contexto = pizarra.value.getContext('2d')
    contexto.lineWidth = 3
    contexto.lineCap = 'round'
    contexto.lineJoin = 'round'
    contexto.strokeStyle = miColor
  }
}

function empezarDibujo(evento) {
    dibujando = true

    contexto.strokeStyle = miColor
    contexto.beginPath()
    contexto.moveTo(evento.offsetX, evento.offsetY)

    socket.emit('draw_begin', {
        roomName: salaActual.value,
        x: evento.offsetX,
        y: evento.offsetY,
        color: miColor
    })
}

function dibujar(evento) {
    if (dibujando) {
        contexto.strokeStyle = miColor
        contexto.lineTo(evento.offsetX, evento.offsetY)
        contexto.stroke()

        socket.emit('draw_move', {
            roomName: salaActual.value,
            x: evento.offsetX,
            y: evento.offsetY,
            color: miColor
        })
    }
}

function terminarDibujo() {
    if (dibujando) {
        dibujando = false

        socket.emit('draw_end', {
            roomName: salaActual.value
        })
    }
}

function recibirInicio(datos) {
    contexto.beginPath()
    contexto.strokeStyle = datos.color
    contexto.moveTo(datos.x, datos.y)
}

function recibirMovimiento(datos) {
    contexto.strokeStyle = datos.color
    contexto.lineTo(datos.x, datos.y)
    contexto.stroke()
}
function moverRaton(evento) {
    dibujar(evento)

    socket.emit('moverCursor', {
        roomName: salaActual.value,
        x: evento.offsetX,
        y: evento.offsetY,
        nombre: nombre.value,
        color: miColor
    })
}
</script>

<template>
  <main>
    <div v-if="!haEntrado">
      <h1>PaintRooms</h1>

      <p>Bienvenido a nuestra pizarra colaborativa.</p>

      <label for="nombre">Escribe tu nombre:</label>

      <input
        id="nombre"
        v-model="nombre"
        placeholder="Tu nombre"
      />

      <button @click="entrar">Entrar</button>
    </div>

    <div v-else-if="salaActual === ''">
      <h1>¡Bienvenido, {{ nombre }}!</h1>

      <h2>Crear una sala</h2>

      <input
        v-model="nombreSalaCrear"
        placeholder="Nombre de la nueva sala"
      />

      <button @click="crearSala">Crear sala</button>

      <hr>

      <h2>Unirse a una sala</h2>

      <input
        v-model="nombreSalaUnir"
        placeholder="Nombre de la sala"
      />

      <button @click="unirseSala">Unirse a la sala</button>
    </div>

    <div v-if="salaActual !== ''">
      <h1>Sala: {{ salaActual }}</h1>

      <p>Usuario: {{ nombre }}</p>

      <div style="position: relative; width: 802px; height: 452px;">
        <canvas
          ref="pizarra"
          id="pizarra"
          width="800"
          height="450"
          style="border: 1px solid black;"
          @mousedown="empezarDibujo"
          @mousemove="moverRaton"
          @mouseup="terminarDibujo"
          @mouseleave="terminarDibujo"
        ></canvas>

        <div
          v-for="cursor in cursores"
          :key="cursor.id"
          :style="{
            position: 'absolute',
            left: cursor.x + 'px',
            top: cursor.y + 'px',
            pointerEvents: 'none'
          }"
        >
          <div
            :style="{
              width: '8px',
              height: '8px',
              backgroundColor: cursor.color,
              borderRadius: '50%',
              border: '1px solid white'
            }"
          ></div>

          <span
            :style="{
              position: 'absolute',
              left: '10px',
              top: '0px',
              backgroundColor: cursor.color,
              color: 'white',
              padding: '0px 8px',
              fontSize: '10px',
              whiteSpace: 'nowrap'
            }"
          >
            {{ cursor.nombre }}
          </span>
        </div>
      </div>

      <br>

      <button @click="salaActual = ''">
        Volver al lobby
      </button>
    </div>
  </main>
</template>