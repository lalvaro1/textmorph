
const simulatedZ = 40;
const focal = 1.;
const scale = 80;
const pixelSize = 0.5;
const expandCue = 1;
const resetCue = 5;
const rotationCue = 5;
const angularSpeed = 1.;
const expansionSpeed = 50.;
const contractionSpeed = 0.2;
const contractionColorSpeed = 10;
const contractionCue = 1.5;
const slowMotionPower = 5;

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
        this.state = -1;     
        this.pixelBuffers = null;
        this.particles = null;
        this.reference = null;
        this.animationTime = 0;
        this.wordIndex = 0;
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

                    pixels.push({ x:x, y:y, z:simulatedZ, color });
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

    expand(pixels, sourcePixels, time) {

        const anim = 1 - 1 / Math.exp(slowMotionPower*time);

        for(let i=0; i<pixels.length; i++) {

            pixels[i].x = sourcePixels[i].x + pixels[i].vx * expansionSpeed * anim;
            pixels[i].y = sourcePixels[i].y + pixels[i].vy * expansionSpeed * anim;
            pixels[i].z = sourcePixels[i].z + pixels[i].vz * expansionSpeed * anim;
        }
    }

    rotate(pixels, dt) {

        for(let pixel of pixels) {

            const localX = pixel.x;
            const localZ = pixel.z - simulatedZ;

            const rotation = angularSpeed * dt;

            const dx = localX * Math.cos(rotation) - localZ * Math.sin(rotation);
            const dz = localX * Math.sin(rotation) + localZ * Math.cos(rotation);

            pixel.x = dx;
            pixel.z = simulatedZ + dz;
        }
    }

    project(x, y, z, angle) {

        const localX = x;
        const localZ = z - simulatedZ;

        const dx = localX * Math.cos(angle) - localZ * Math.sin(angle);
        const dz = localX * Math.sin(angle) + localZ * Math.cos(angle);

        x = dx;
        z = simulatedZ + dz;

        return { x:x*focal/z, y:y*focal/z, z:0 };
    }

    blit(ctx, pixels, X, Y, angle) {

        for(let pixel of pixels) {

            if(pixel.z > 0) {
                ctx.fillStyle = `rgb(${pixel.color}, ${pixel.color}, ${pixel.color})`;
                const screenCoords = this.project(pixel.x, pixel.y, pixel.z, angle);
                ctx.fillRect(X + screenCoords.x * scale, Y + screenCoords.y * scale, pixelSize*scale/pixel.z, pixelSize*scale/pixel.z);
            }
        }
    }

    contract(pixels, sourcePixels, destinationPixels, time) {

        const anim = Math.min(1 / Math.exp((10-2*time)), 1);

        for(let n=0; n<pixels.length; n++) {
            pixels[n].x = this.lerp(sourcePixels[n].x, destinationPixels[n].x, anim);
            pixels[n].y = this.lerp(sourcePixels[n].y, destinationPixels[n].y, anim);
            pixels[n].z = this.lerp(sourcePixels[n].z, destinationPixels[n].z, anim);
            pixels[n].color = this.lerp(sourcePixels[n].color, destinationPixels[n].color, anim);
        }
    }

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

    preparePixels(canvas, words) {
        const buffers = []
        let maxNbPixels = 0;

        const blackPixel = {x:0, y:0, z:simulatedZ, color:0}

        for(let word of words) {
            const pixelBuffer = this.getPixels(canvas, word);
            buffers.push(pixelBuffer);
            maxNbPixels = Math.max(maxNbPixels, pixelBuffer.pixels.length);
        }

        for(let buffer of buffers) {

            const nbPixelToAdd = maxNbPixels - buffer.pixels.length;

            for(let i=0; i<nbPixelToAdd; i++) {
                buffer.pixels.push(blackPixel);
            }
        }

        return buffers;
    };

    initParticles(pixels) {

        const particles = [];

        for(let pixel of pixels) {
            particles.push({ x: pixel.x, y: pixel.y, z: simulatedZ,
                             vx: 0, vy: 0, vz: 0, color: pixel.color });
        }

        return particles;
    }

    assignRandomVelocity(particles) {
        for(let particle of particles) {
            if(particle.color>0) {
                const velocity = this.randomVelocity(0.6, 0.8);
                particle.vx = velocity.x;
                particle.vy = velocity.y;
                particle.vz = velocity.z;
            }
        }
    }

    init() {
        const offscreen = document.createElement('Canvas');
        offscreen.width  = 400;
        offscreen.height = 100;

        const words = [ "Into", "the", "flood", "again", "Same", "old trip", "it was", "back then" ];
        this.pixelBuffers = this.preparePixels(offscreen, words);
        this.particles = this.initParticles(this.pixelBuffers[0].pixels);
    }

    takeSnapShot(particles) {
        const snapShot = [];

        for(let particle of particles) {
            snapShot.push(particle);
        }

        return snapShot;
    }

    render({ctx, time}) {

        const dt = time - this.lastFrame;
        this.animationTime += dt;
        this.lastFrame = time;

        const animPeriod = 3.;
        const animTransition = 0.5;

        const W = ctx.canvas.width;
        const H = ctx.canvas.height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        switch(this.state) {

            case -1: {
                this.init();
                this.state++;
            }

            case 0: {
                this.assignRandomVelocity(this.particles);
                this.state++;
                break;
            }

            case 1: {
                if(this.animationTime>expandCue) {
                    this.animationTime = 0;
                    this.state++;
                }
                break;
            }

            case 2: {
                this.expand(this.particles, this.pixelBuffers[this.wordIndex%this.pixelBuffers.length].pixels, this.animationTime);                

                if(this.animationTime>contractionCue) {
                    this.animationTime = 0;
                    this.reference = this.takeSnapShot(this.particles);
                    this.state++;
                }
                break;
            }

            case 3: {
                this.contract(this.particles, this.reference, this.pixelBuffers[(this.wordIndex+1)%this.pixelBuffers.length].pixels, this.animationTime);                

                if(this.animationTime>resetCue) {
                    this.animationTime = 0;
                    this.state = 1;
                    this.wordIndex++;
                }
                break;
            }

        }
 
        /*
        else if(time<rotationCue) {
            this.rotate(this.fallingEdgeBuffer.pixels, dt);
            this.rotate(this.risingEdgeBuffer.pixels, dt);            
        }
        else if(time<contractionCue) {
            this.rotate(this.fallingEdgeBuffer.pixels, dt);
            this.rotate(this.risingEdgeBuffer.pixels, dt);            
            this.contractTo(this.risingEdgeBuffer.pixels, this.fallingEdgeBuffer.pixels, time - rotationCue);
        }
        */

       const rotationAngle = Math.sin(time)*0.125;//this.state==3? Math.min(this.animationTime*this.animationTime, 2*Math.PI) : 0;

       this.blit(ctx, this.particles, W/2, H/2, rotationAngle);
    }
}

FX.push(textMorphing);
