import * as Vue from '/dependencies/vue.js'
import { bomb, grenades, map, options, players, radars } from '/hud/core/state.js'
import { connectToWebsocket } from '/hud/core/websocket.js'
import { loadModule } from '/dependencies/vue3-sfc-loader.js'
import { sfcLoaderOptions } from '/dependencies/vue3-sfc-loader-options.js'

connectToWebsocket()

const app = Vue.createApp({
    template: `
        <div class="analysis-container">
            <div class="radar-container">
                <Radar />
                <SvgFilters />
            </div>
            <div class="drawing-layer">
                <canvas 
                    ref="drawingCanvas"
                    @mousedown="startDrawing"
                    @mousemove="draw"
                    @mouseup="stopDrawing"
                    @mouseleave="stopDrawing"
                ></canvas>
            </div>
            
            <div class="controls">
                <div 
                    v-for="color in colors" 
                    :key="color" 
                    class="color-dot" 
                    :class="{ '--active': drawingColor === color }"
                    :style="{ background: color }"
                    @click="drawingColor = color"
                ></div>
                <button @click="clearDrawing">Clear</button>
            </div>
        </div>
    `,
    data() {
        return {
            isDrawing: false,
            lastX: 0,
            lastY: 0,
            drawingColor: '#ff5a00',
            drawingSize: 5,
            colors: ['#ff5a00', '#3498db', '#2ecc71', '#f1c40f', '#ffffff']
        }
    },
    mounted() {
        window.addEventListener('resize', this.resizeCanvas)
        this.resizeCanvas()
        
        // Listen for drawing events from others
        window.addEventListener('message', this.handleWsMessage)
        
        // Hook into the same websocket logic
        this.initWsHandlers()
    },
    methods: {
        resizeCanvas() {
            const canvas = this.$refs.drawingCanvas
            if (!canvas) return
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        },
        
        initWsHandlers() {
            // We need to listen to the global broadcast stream
            // This is handled by websocket-on-message.js in the core
            // But we can also add custom listeners here if needed
        },

        startDrawing(e) {
            this.isDrawing = true
            const pos = this.getCanvasPos(e)
            this.lastX = pos.x
            this.lastY = pos.y
        },

        draw(e) {
            if (!this.isDrawing) return
            const pos = this.getCanvasPos(e)
            
            const eventData = {
                x1: this.lastX,
                y1: this.lastY,
                x2: pos.x,
                y2: pos.y,
                color: this.drawingColor,
                size: this.drawingSize
            }

            // Sync with server
            window.ws?.send(JSON.stringify({ event: 'draw:line', body: eventData }))

            this.lastX = pos.x
            this.lastY = pos.y
        },

        stopDrawing() {
            this.isDrawing = false
        },

        clearDrawing() {
            window.ws?.send(JSON.stringify({ event: 'draw:clear' }))
        },

        getCanvasPos(e) {
            const canvas = this.$refs.drawingCanvas
            const rect = canvas.getBoundingClientRect()
            return {
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height
            }
        }
    }
})

app.component('Radar', Vue.defineAsyncComponent(() => loadModule('/hud/radar/radar.vue', sfcLoaderOptions)))
app.component('SvgFilters', Vue.defineAsyncComponent(() => loadModule('/hud/svg-filters/svg-filters.vue', sfcLoaderOptions)))

app.config.globalProperties.$bomb = bomb
app.config.globalProperties.$grenades = grenades
app.config.globalProperties.$map = map
app.config.globalProperties.$opts = options
app.config.globalProperties.$players = players
app.config.globalProperties.$radars = radars

app.mount('#app')
