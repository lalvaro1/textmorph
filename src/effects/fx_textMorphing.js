
const simulatedZ = 2;
const focal = 2.;
const scale = 5;
const pixelSize = 1;
const rotatePhase = 15;
const expandPhase = 5;
const speedScaling = 0.01;

class textMorphing extends Default {

    constructor({ctx, guiBuilder}) {

        super({ctx, guiBuilder});

        // ctx: canvas's context
        // guiBuilder: builder to add specific elements to gui (see https://github.com/dataarts/dat.gui/blob/master/API.md)

        // Uncomment lines below to create custom settings

        // // create data model
        // this.mySettings = {
        //     blur: 0.5,
        //     shadowColor: '#0000FF',
        // };
        //
        // // ensure settings are saved upon reloads
        // guiBuilder.remember(this.mySettings);
        //
        // // create menu entries
        // var myFolder = guiBuilder.addFolder('My custom settings');
        // myFolder.add(this.mySettings, 'blur', 0, 1, 0.01)
        // myFolder.addColor(this.mySettings, 'shadowColor');
        this.risingEdgeBuffer = null;
        this.fallingEdgeBuffer = null;        
        this.edge = 0;
        this.wordIndex = 1;
        this.lastFrame = 0;
    }

    onKeyDown({key}) {
        // value is printed in console when a key is pressed
    }

    onMouseMoved({position, uv, event}) {
        // position.[xy]: in pixels
        // uv.[uv]: in [0..1] range
        // event: raw browser event with button, modifiers, and more.
    }

    onMouseClicked({position, uv, event}) {
        // position.[xy]: in pixels
        // uv.[uv]: in [0..1] range
        // event: raw browser event with button, modifiers, and more.
    }

    /* Method called each render frame, up to */
    /* 60 times per second on a 60hz monitor  */

    randomVelocity(minVelocity, maxVelocity) {

        const velocity = minVelocity + (maxVelocity - minVelocity) * Math.random();

        const vx = Math.random() * 2 - 1;
        const vy = Math.random() * 2 - 1;
        const vz = Math.random() * 2 - 1;

        const length = Math.sqrt(vx*vx+vy*vy+vz*vz);

        return { x: vx*velocity/length, y: vy*velocity/length, z: vz*velocity/length}
    }

    getPixels(canvas, word) {

        this.offsetDrawWord(canvas, word);

        const ctx = canvas.getContext('2d');        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = [];

        let minX = Number.MAX_VALUE;    
        let maxX = Number.MIN_VALUE;            
        let minY = Number.MAX_VALUE;    
        let maxY = Number.MIN_VALUE;            

        for(let y=0; y<canvas.height; y++) {
            for(let x=0; x<canvas.width; x++) {

                const index = (x+y*canvas.width)*4+1;
                const color = imgData.data[index];

                if(color>0) {

                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);                    
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);                    

                    const rv = this.randomVelocity(0.5, 0.8);    

                    pixels.push({ x:x, y:y, z:simulatedZ, vx:rv.x, vy:rv.y, vz:rv.z, color });
                }
            }
        }

        const pixelWidth  = maxX-minX+1;
        const pixelHeight = maxY-minY+1;        

        for(let pixel of pixels) {
            pixel.x -= (minX + pixelWidth/2);
            pixel.y -= (minY + pixelHeight/2);            
        }

        pixels.sort(() => (Math.random() > .5) ? 1 : -1);

        return { pixels, pixelWidth, pixelHeight };
    }

    lerp(v1, v2, ratio) {
        return v2*ratio+v1*(1-ratio);
    }

    length(x, y) {
        return Math.sqrt(x*x+y*y);
    }

    expand(pixels, time) {

        for(let pixel of pixels) {

            const velocityCorrection = Math.pow(time/5, 1/20); 
            const speedScaling = 0.01;

            pixel.x += pixel.vx * speedScaling * velocityCorrection;
            pixel.y += pixel.vy * speedScaling * velocityCorrection;
            pixel.z += pixel.vz * speedScaling * velocityCorrection;
        }
    }

    rotate(pixels, dt) {

        for(let pixel of pixels) {

            const velocityCorrection = Math.pow(time/5, 1/20); 

            const localX = pixel.x;
            const localZ = pixel.z - simulatedZ;

            const angularSpeed = 1;
            const rotation = angularSpeed * dt;

            const dx = localX * Math.cos(rotation) + localZ * Math.sin(rotation);
            const dz = localX * -Math.sin(rotation) + localZ * Math.cos(rotation);

            pixel.x = dx;
            pixel.z = simulatedZ + dz;
        }
    }

    project(x, y, z) {
        return { x:x*focal/z, y:y*focal/z, z:0 };
    }

    blit(ctx, pixels, X, Y, dt) {

        for(let pixel of pixels) {

            if(pixel.z > 0) {
                ctx.fillStyle = `rgb(${pixel.color}, ${pixel.color}, ${pixel.color})`;
                const screenCoords = this.project(pixel.x, pixel.y, pixel.z);
                ctx.fillRect(X + screenCoords.x * scale, Y + screenCoords.y * scale, pixelSize*scale/pixel.z, pixelSize*scale/pixel.z);
            }
        }
    }

/*

        const maxPixels = Math.max(pixels1.length, pixels2.length);        
        const blackPixel = { x: 0, y: 0, z: 0, vx:0, vy:0, vz:0, color : 0 };

        for(let n=0; n<maxPixels; n++) {

            let sourcePixe-l, destinationPixel;

            if(n>=pixels1.length) {
                sourcePixel = { x: 0, y: 0, z: 0, vx:0, vy:0, vz:0, color : 0 };
                destinationPixel = pixels2[n];
            }
            else 
            if(n>=pixels2.length) {
                sourcePixel = pixels1[n];                
                destinationPixel = { x: 0, y: 0, z: 0, vx:0, vy:0, vz:0, color : 0 };
            }
            else {
                sourcePixel = pixels1[n];
                destinationPixel = pixels2[n];
            }

            if(time < 5) {
                const pixel = this.expand(sourcePixel, time);

                sourcePixel.x = pixel.x;


                ctx.fillStyle = `rgb(${pixel.color}, ${pixel.color}, ${pixel.color})`;
                ctx.fillRect(X + pixel.x*4, Y + pixel.y*4, 2, 2);
            }
        }
        
    }
    */

    offsetDrawWord(canvas, text) {

        const offscreenCtx = canvas.getContext('2d');

        offscreenCtx.fillStyle = '#000';
        offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);

        offscreenCtx.fillStyle = '#fff';
        offscreenCtx.font = '30px monospace';
        offscreenCtx.fillText(text, 10, 30);
    }

    clamp(x, v1, v2) {
        return Math.min(Math.max(v1, x), v2);
    }

    render({ctx, time}) {

        const dt = time - this.lastFrame;
        this.lastFrame = time;

        const animPeriod = 3.;
        const animTransition = 0.5;

        const animation = 1 - (Math.sin(this.clamp((Math.abs(((time-animPeriod/2)%(animPeriod*2))-animPeriod)-animPeriod/2)*(1/animTransition), -1.57, 1.57)) * 0.5 + 0.5);
        
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        const offscreen = document.createElement('Canvas');
        offscreen.width  = 400;
        offscreen.height = 100;

        const words = [ "Into", "the", "flood", "again", "Same", "old trip", "it was", "back then" ];

        if(this.risingEdgeBuffer == null) {
            this.fallingEdgeBuffer = this.getPixels(offscreen, words[0]);
            this.risingEdgeBuffer = this.getPixels(offscreen, words[1]);
        }

        if(time<expandPhase) {
           this.expand(this.fallingEdgeBuffer.pixels, dt);
        }
        else if(time<rotatePhase) {
            this.rotate(this.fallingEdgeBuffer.pixels, dt);
        }
 

       this.blit(ctx, this.fallingEdgeBuffer.pixels, W/2, H/2);
    }
}

FX.push(textMorphing);
