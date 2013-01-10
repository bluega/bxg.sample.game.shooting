////////////////////////////////////////////////////////////////////////////////
// Sample - 1Way
/*
	Objectives:
		Controlling C1WayBufferedScrollControl
		Using CAccelerometerDevice and CTabDevice
*/
"Copyright ⓒ 2009-2012 BLUEGA Inc.";
"This sample game source is licensed under the MIT license."

////////////////////////////////////////////////////////////////////////////////
// Object manager for bxg.player

IFighterManager = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		// Initialize data
		obj.data.screenPadding = {left:10, right:10, top:0, bottom:0};
		obj.data.dx = 0;
		obj.data.dxPrev = 0;
		obj.data.overScr = {};
		obj.data.speed = bxg.game.adjustByTick(30, 8, true) || 1; // at a speed of 8 pixel per 30ms tick interval.
		obj.data.life = 100;
		
		obj.show();
	}
	,onTick: function(/*Object*/obj, /*Number*/tickId)
	{
		// Keep this object inside view screen.
		if (obj.data.dx){
			obj.overControlScreen(obj.data.overScr, false, obj.data.screenPadding);
			
			if ((obj.data.overScr.x == 1/*LEFT*/ && obj.data.dx < 0) || (obj.data.overScr.x == 2/*RIGHT*/ && obj.data.dx > 0)){
				obj.data.dx = 0;
			}
		}
		else{
			// If no move by input device, then set to 'center' sprite.
			if (obj.data.dxPrev == 0){
				obj.setCurSpriteState('center');
			}
		}
		
		if (obj.data.dx){
			obj.moveBy(obj.data.dx, 0);
		}
		
		// To check out the direction and stop, it needs previous value.
		obj.data.dxPrev = obj.data.dx;
	}
	,onCollision: function(/*Object*/obj, /*Object*/hit)
	{
		if (hit.type == 'obj.bullet' || hit.type == 'obj.bossShot'){
			//bxg.shake(6, bxg.game.tickInterval, 3, 'v');
			obj.data.life--;
		}
		if(!obj.data.life) {
			obj.deactivate();
			bxg.game.end();
			bxg.game.run();
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
// Object manager for cannon

ICannonManager = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		obj.show();
	}
	,onTick: function(/*Object*/obj, /*Number*/tickId)
	{
		// Need distance and angle from cannon to player fighter.
		obj.data._dist = bxg.Geometry.getDistance(obj.center(true), bxg.player.center(true));
		obj.data._angle = bxg.Geometry.getAngle(obj.center(true), bxg.player.center(true));
		
		// Set sprite by anagle. In this game, it doesn't use 'rotate' of image due to performance issue.
		obj.data._sprite = 'cannon'+parseInt((obj.data._angle%360)/20)*20;
		obj.setCurSpriteState(obj.data._sprite);
		
		// Shot if;
		//  - Free bullet, and
		//  - Distance to bxg.player is over 350px and probability of 20% and
		//  - Angle range between 110 ~ 250
		if ((obj.data._angle >= 110 && obj.data._angle <= 250) && obj.data._dist > 350 && Math.random() < 0.2){
			if (obj.data._bullet = bxg.g.poolBullet.searchFree()){
				obj.data._bullet.data.launcher = obj;
				obj.data._bullet.activate();
			}
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
// Object manager for boss
//  - Object with this will (1) move downward, (2) attack(fire) and (3) dash(move) downward.

IBossManager = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		obj.data.state = 0;
		obj.data.nextStateTick = 0;
		obj.data.dx = obj.data.dy = 0;
		
		obj.show();
	}
	,onTick: function(/*Object*/obj, /*Number*/tickId)
	{
		switch(obj.data.state){
		case 0: // Move forward(downward)
			if (!obj.data.nextStateTick) obj.data.nextStateTick = bxg.game.tickAfter(tickId, 1200+Math.random()*400);
			
			obj.data.dy = bxg.game.adjustByTick(30, 6, true) || 1;
			break;
		case 1: // Attack(fire)
			if (!obj.data.nextStateTick) obj.data.nextStateTick = bxg.game.tickAfter(tickId, 16000); // 16sec
			
			// Fire at 50% posibility.
			if (Math.random() < 0.5){ // 50%
				if (obj.data._bullet = bxg.g.poolBulletBoss.searchFree()){
					obj.data._bullet.data.launcher = obj;
					obj.data._bullet.activate();
				}
			}
			
			obj.data.dy = 0;
			break;
		case 2: // Dash forward
			obj.data.dy = bxg.game.adjustByTick(30, 10, true) || 1;
			break;
		}
		
		if (obj.data.dx || obj.data.dy){
			obj.moveBy(obj.data.dx, obj.data.dy);
		}
		
		// State transition
		if (obj.data.nextStateTick < tickId){
			obj.data.state ++;
			obj.data.nextStateTick = 0;
		}
		
		// If 'damage' sprite is done, then changed to 'normal' sprite state.
		if(obj.getCurSpriteState() == 'damage' && obj.doesCurSpritePlayEnd('damageEffect')) {
			obj.setCurSpriteState('normal', true);
		}
	}
	,onOutView: function(/*Object*/obj)
	{
		obj.deactivate();
	}
	,onCollision: function(/*Object*/obj, /*Object*/hit)
	{
		if (hit.type == 'obj.fighterShot') {
			obj.setCurSpriteState('damage', true);
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
// Object manager for cannon bullet
//  - Object with this will be fired at the tip of cannon barrel, so, it needs to caculate the angle of cannon barrel.
//  - Object with this will be deactivated on hit to player fighter or on out of view screen.

IBulletManager = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		obj.data.speed = bxg.game.adjustByTick(30, 10, true) || 1;
		
		// Canculate angle and set position to the tip of barrel
		// In obj.data.launcher.center(true), 'true' means that it needs to be transformed to view coordinate system.
		// Because bullets and player fighter are in different control and they (may) have different coordinate system.
		obj.data._angle = bxg.Geometry.getAngle(obj.data.launcher.center(true), bxg.player.center(true), true);
		obj.move(obj.data.launcher.center(true).x + parseInt(Math.sin(obj.data._angle)*obj.data.launcher.size.w/2 - obj.size.w/2), obj.data.launcher.center(true).y + parseInt(-Math.cos(obj.data._angle)*obj.data.launcher.size.h/2 - obj.size.h/2));
	
		bxg.WalkerLinear.set(obj, {speed:obj.data.speed, radian:obj.data._angle});
			
		obj.show();
	}
	,onTick: function(/*Object*/obj, /*Number*/tickId)
	{
		bxg.WalkerLinear.move(obj);
	}
	,onCollision: function(/*Object*/obj, /*Object*/hit)
	{
		if (hit == bxg.player){
			obj.deactivate();
		}
	}
	,onOutView: function(/*Object*/obj)
	{
		obj.deactivate();
	}
}

////////////////////////////////////////////////////////////////////////////////
// Object manager for Boss shot

IDownShotManager = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		obj.data.speed = bxg.game.adjustByTick(30, 12, true) || 1;
		obj.move(obj.data.launcher.center(true).x-obj.size.w/2, obj.data.launcher.position().y+obj.data.launcher.size.h);
		obj.show();
	}
	,onTick: function(/*Object*/obj, /*Number*/tickId)
	{
		obj.moveBy(0, obj.data.speed);
	}
	,onCollision: function(/*Object*/obj, /*Object*/hit)
	{
		if (hit == bxg.player){
			obj.deactivate();
		}
	}
	,onOutView: function(/*Object*/obj)
	{
		obj.deactivate();
	}
}

////////////////////////////////////////////////////////////////////////////////
// Object manager for Fighter shot

ILaserShotManager = {
	onActivate: function(/*Object*/obj, /*Number*/tickId)
	{
		obj.data.speed = bxg.game.adjustByTick(30, 12, true) || 1;

		obj.setCurSpriteState('shot1',true);
		obj.queueSpriteState('shot2');
		//alert(obj.getCurSpriteState());
		obj.render();
		obj.show();
	}
	,onTick: function(/*Object*/obj, /*Number*/tickId)
	{
		switch(obj.getCurSpriteState()) {
			case 'shot1': {
				obj.move(obj.data.launcher.center(true).x + obj.data.offset.x - obj.size.w/2, obj.data.launcher.center().y + obj.data.offset.y - obj.size.h);
				break;
			}
			case 'shot2': {
				obj.moveBy(0, -obj.data.speed);
				break;
			}
			case 'explode' : {
				if(obj.doesCurSpritePlayEnd()) {
					obj.deactivate();
				}
				break;
			}
		}
	}
	,onCollision: function(/*Object*/obj, /*Object*/hit)
	{
		if (hit.type == obj.data.target){
			if(obj.getCurSpriteState()!='explode') {
				obj.setCurSpriteState('explode');
				
				obj.useCollisionDetection(false);
			}
		}
	}
	,onOutView: function(/*Object*/obj)
	{
		obj.deactivate();
	}
	,makeShot: function(/*CObject*/launcher, /*Object*/opts)
	{
		var obj = bxg.g.poolBulletFighter.searchFree();
		
		if (obj) {
			obj.data.launcher = launcher;
			if(opts) {
				obj.data.target = opts.target || "";
				obj.data.offset = opts.offset || {x:0, y:0};
			}
			obj.move(obj.data.launcher.center(true).x + obj.data.offset.x - obj.size.w/2, obj.data.launcher.center().y + obj.data.offset.y -obj.size.h);
			obj.activate();
		}
		return obj;
	}
}

////////////////////////////////////////////////////////////////////////////////
// Control manager for scrolling

IScrollManager = {
	onTick: function(/*CControl*/control, /*Number*/tickId)
	{
		control.scroll(0, Math.max(1, bxg.game.adjustByTick(30, 1)));

		// Create objects by map
		while(control.data.map.objs[control.data.curMapDataPos] && (control.data.map.objs[control.data.curMapDataPos].y+control.data.map.objs[control.data.curMapDataPos].h) >= -control.scrollPos.y){
			control.data._type = control.data.map.objs[control.data.curMapDataPos].type;
			var obj = bxg.ObjectFactory.build(control.data._type);
			control.data.objsInMap.push(obj);
			if (control.data._type == 'obj.boss'){
				bxg.g.ctlSky.add(obj);
				obj.move(control.data.map.objs[control.data.curMapDataPos].x-obj.size.w/2, control.data.map.objs[control.data.curMapDataPos].y+control.scrollPos.y);
				obj.activate();
			}
			if (control.data._type == 'obj.cannon'){
				control.add(obj);
				obj.move(control.data.map.objs[control.data.curMapDataPos].x-obj.size.w/2, control.data.map.objs[control.data.curMapDataPos].y);
				obj.activate();
				
				// Create base
				var base = bxg.ObjectFactory.build('img.cannonBase', {baseLayer:true, zIndex:10});
				
				control.add(base);
				base.move(obj.position().x+17, obj.position().y+17);

				control.data.objsInMap.push(base);
			}
			
			control.data.curMapDataPos ++;
		}
	}
	,onReset: function(/*CControl*/control)
	{
		if(!control.data.isCreated) { // map loading
			control.data.isCreated = true;
			
			// Init internal data
			control.data.map = bxg.g.map;
			
			// Sort map data by descendant order
			control.data.map.objs.sort(function(a, b){return (b.y+b.h) - (a.y+a.h);});
			
			// Create & set background pattern
			control.data.background = new bxg.CImage(control.data.map.bg, {baseLayer:true, zIndex:0, pattern:true});
			bxg.g.ctlLand.add(control.data.background);
			
			// Create & set tile
			for(var i = 0; i < control.data.map.tiles.length; i ++){
				control.data.map.tiles[i].obj =	bxg.ObjectFactory.build(
					control.data.map.tiles[i].img
					,{
						baseLayer:true,
						zIndex:control.data.map.tiles[i].zIndex,
						rotate:control.data.map.tiles[i].rotate,
						resize:control.data.map.tiles[i].resize
					}
				);
				control.add(control.data.map.tiles[i].obj).move(control.data.map.tiles[i].x, control.data.map.tiles[i].y);
			}
			control.data.objsInMap = [];
		}
		else {
			// Remove & delete all objects which has created in previous game run.
			for(var i=0;i<control.data.objsInMap.length;i++) {
				if (control.data.objsInMap[i].type == 'obj.boss'){
					bxg.g.ctlSky.remove(control.data.objsInMap[i]);
				}
				else {
					control.remove(control.data.objsInMap[i]);
				}
				control.data.objsInMap[i].destroy();
			}		
			control.data.objsInMap.length = 0;
		}
		
		// Init internal data
		control.data.curMapDataPos = 0;
	}
}

// This control manager is for sky layer. 
// The player object will run here, so, in this game, this manager will control main game logic.
ISkyControlManager = {
	onInputEvent: function(/*CControl*/control, /*Object*/evtMap)
	{
		bxg.player.data.dx = 0;
		
		if (evtMap.moveLeft && evtMap.moveLeft.fired){
			bxg.player.data.dx = -bxg.player.data.speed; //W(L)
			
			if (!(bxg.player.getCurSpriteState() == 'left0' || bxg.player.getCurSpriteState() == 'left1')){
				bxg.player.setCurSpriteState('left0');
				bxg.player.queueSpriteState('left1');
			}
		}
		else if (evtMap.moveRight && evtMap.moveRight.fired){
			bxg.player.data.dx = bxg.player.data.speed; //E(R)
			
			if (!(bxg.player.getCurSpriteState() == 'right0' || bxg.player.getCurSpriteState() == 'right1')){
				bxg.player.setCurSpriteState('right0');
				bxg.player.queueSpriteState('right1');
			}
		}
		
		if (evtMap.errorIME && evtMap.errorIME.fired){
			alert('Please, switch the keyboard to Alphabet type mode to play this game!');
		}
		
		if (evtMap.fireShot && evtMap.fireShot.fired){
			ILaserShotManager.makeShot(bxg.player, {target:'obj.boss', offset:{x:-25, y:0}}); // Left side shot
			ILaserShotManager.makeShot(bxg.player, {target:'obj.boss', offset:{x:+25, y:0}}); // Right side shot
		}
	}
	,onReset: function(/*CControl*/control)
	{
		
		// Activate player and start it from center position
		bxg.player.move(parseInt((control.area.w - bxg.player.size.w)/2), control.area.h - bxg.player.size.h - 20);
		bxg.player.activate();
		bxg.player.show();
	}
}

////////////////////////////////////////////////////////////////////////////////
// Game core

bxg.onGame = function ()
{
	/*
		zIndex band of this game
			Land Control:
					0: background pattern
					1~: land cracks
					9: bush
				10 ~
					10: Cannon-base
					11: Cannon
			Sky Control
					1: Cannon Bullet
				10 ~
					10: Boss
					11: Boss shot
				20 ~
					20: Player
					21: Player shot
	*/
	
	bxg.c.render = bx.$getParamFromURL(location.href, 'RD') || 'canvas';
	bxg.c.tick = 30; //msec
	bxg.c.countCannon = 20;
	bxg.c.countBullet = 10;		// Shot by Cannon
	bxg.c.countBulletBoss = 10;	// Shot by Boss
	bxg.c.countBush = 80;
	bxg.c.countPane = 6;
	bxg.c.countBulletFighter = 10; // Shot by Fighter
	bxg.c.scrSize = {w:480, h:600};
	
	// Initialize BXG engine, aligning in page center
	bxg.init({x:0, y:0, w:bxg.c.scrSize.w, h:bxg.c.scrSize.h}, {renderer:bxg.c.render, align:{x:'center', y:'center'}});
	
	// Turn on waiting-box for game loading
	bx.UX.waitBox(true, "Loading...");
	
	// (very simple) Example Level(Map) Data which has information on objects and images in level.
	bxg.g.map = {
		objs:[
			{x:parseInt(bxg.c.scrSize.w*0.3), y:2700, h:100, type:'obj.cannon'}
		    ,{x:parseInt(bxg.c.scrSize.w*0.5), y:2650, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.7), y:2700, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.2), y:2000, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.5), y:1900, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.8), y:2000, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.3), y:1000, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.7), y:1000, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.4), y:160, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.6), y:160, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.2), y:20, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.5), y:10, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.8), y:20, h:100, type:'obj.cannon'}
			,{x:parseInt(bxg.c.scrSize.w*0.2), y:1000, h:192, type:'obj.boss'}
			,{x:parseInt(bxg.c.scrSize.w*0.8), y:1000, h:192, type:'obj.boss'}
			,{x:parseInt(bxg.c.scrSize.w*0.3), y:2200, h:192, type:'obj.boss'}
			,{x:parseInt(bxg.c.scrSize.w*0.7), y:2200, h:192, type:'obj.boss'}
		]
		,bg:'background'
		,tiles:[
			{x:0, y:-321, img:'img.crack', zIndex:1, rotate:45}
			,{x:0, y:3300, img:'img.crack', zIndex:2, rotate:45}
			,{x:-220, y:2800, img:'img.crack', zIndex:3, rotate:45, resize:{w:600, h:600}}
		]
	};
	
	for(var tile = 0; tile < bxg.c.countBush; tile ++){
		bxg.g.map.tiles.push({x:Math.floor(bxg.c.scrSize.w*Math.random()), y:Math.floor(bxg.c.scrSize.h*bxg.c.countPane*Math.random()), img:'img.bush', zIndex:9});
	}
	
	// Object template to be created by ObjectFactory
	bxg.g.objs = [
		{
			type:'obj.cannon'
			,imagePath:'imgs/cannon'
			,images:{
				cannon:{url:'$$.png', count:18, start:1}
			}
			,info:{
				cannon0:{sprite:['cannon1']}
				,cannon340:{sprite:['cannon18']}, cannon320:{sprite:['cannon17']}, cannon300:{sprite:['cannon16']}, cannon280:{sprite:['cannon15']}
				,cannon260:{sprite:['cannon14']}, cannon240:{sprite:['cannon13']}, cannon220:{sprite:['cannon12']}, cannon200:{sprite:['cannon11']}
				,cannon180:{sprite:['cannon10']}, cannon160:{sprite:['cannon9']}, cannon140:{sprite:['cannon8']}, cannon120:{sprite:['cannon7']}
				,cannon100:{sprite:['cannon6']}, cannon80:{sprite:['cannon5']}, cannon60:{sprite:['cannon4']}, cannon40:{sprite:['cannon3']}
				,cannon20:{sprite:['cannon2']}
			}
			,options:{
				manager:ICannonManager
				,cdShape:[{circle:{x:7, y:8, r:4}}]
				,zIndex:11
			}
		}
		,{
			className:'bxg.CCompositeObject'
			,type:'obj.boss'
			,imagePath:'imgs/boss'
			,images:{
				bossN_1:{url:'m1_body.png'},
				bossD_1:{url:'m1_d.png', opacity:0.5},
				bossD_2:{url:'1px.png'},
				bossB1_:{url:'m1_down_31x27.jpg', sprite:{size:{w:31, h:27}, cols:3, count:3}},
				bossB2_:{url:'m1_up_31x27.jpg', sprite:{size:{w:31, h:27}, cols:3, count:3}},
				bossBT_:{url:'m1_boost_17x46.png', sprite:{size:{w:17, h:46}, cols:2, count:2}}
			}
			,info:{
				sprites:{
					body:{
						sprite:{flying:['bossN_1']}
						,offset:{left:0, top:46}
					},
					down:{
						sprite:{spin:['bossB1_1', 'bossB1_2', 'bossB1_3']}
						,offset:{left:43, top:114}
					},
					up:{
						sprite:{spin:['bossB2_1', 'bossB2_2', 'bossB2_3']}
						,offset:{left:43, top:66}
					},
					booster:{
						sprite:{blazing:['bossBT_1', 'bossBT_2']}
						,offset:{left:50, top:0}
					},
					damageEffect:{
						sprite:{normal:['bossD_2'],
								dmg:['bossD_1', 'bossD_2', 'bossD_1', 'bossD_1']
						}
						,speed:Math.ceil(10/bxg.game.adjustByTick(30, 2))
						,offset:{left:0, top:46}
						,zIndex:1		// Sprite's zIndex value within game object
					}
				}
				,states:{
					normal:{
						config:{
							body:{group:'flying'},
							down:{group:'spin'},
							up:{group:'spin'},
							booster:{group:'blazing'},
							damageEffect:{group:'normal'}
						}
					},
					damage:{
						config:{
							damageEffect:{group:['dmg', 'normal']}
						}
					}
				}
			}
			,options:{
				manager:IBossManager
				,cdShape:[{rect:{x:18, y:0, w:80, h:180}}]
				,size:{w:116, h:195}
				,zIndex:10		// Object's zIndex value within game control
			}
		}
		,{
			type:'obj.bossShot'
			,imagePath:'imgs/boss'
			,images:{
				bossShotN_:{url:'m1_20x21.png', sprite:{size:{w:20, h:21}, cols:6, count:6}}
			}
			,info:{
				normal:{sprite:['bossShotN_1', 'bossShotN_2', 'bossShotN_3','bossShotN_4', 'bossShotN_5', 'bossShotN_6']}
			}
			,options:{
				manager:IDownShotManager
				,cdShape:[{circle:{x:7, y:8, r:4}}]
				,zIndex:11
			}
		}
		,{
			type:'obj.fighterShot'
			,imagePath:'imgs/shot'
			,images:{
				laser:{url:'laser$$.png', count:5, start:1}
				,explode0:{url:'explode.png'}
				,explode1:{url:'1px.png'}
			}
			,info:{
				shot1:{sprite:['laser1', 'laser2', 'laser3', 'laser4']}
				,shot2:{sprite:['laser5']}
				,explode:{sprite:['explode0', 'explode1', 'explode0', 'explode1', 'explode0'],offset:{x:-41, y:-46}}
			}
			,options:{
				manager:ILaserShotManager
				,cdShape:[{rect:{x:10, y:5, w:9, h:70}}]
				,zIndex:21
				,sprite:{speed:Math.ceil(8/bxg.game.adjustByTick(30, 4))}
			}
		}
		,{
			className:'bxg.CImage'
			,type:'img.crack'
			,imagePath:'imgs/bg/desert/'
			,info:'crack.png'
		}
		,{
			className:'bxg.CImage'
			,type:'img.bush'
			,imagePath:'imgs/bg/desert/'
			,info:'trees.png'
		}
		,{
			className:'bxg.CImage'
			,type:'img.cannonBase'
			,imagePath:'imgs/cannon/'
			,info:'base.png'
		}
	];
	
	// Register object templates to the object factory
	for(var obj = 0; obj < bxg.g.objs.length; obj ++){
		bxg.ObjectFactory.register(bxg.g.objs[obj]);
	}
	
	// Example to get a progress status of image loading
	function onProgress(/*Number*/countLoaded, /*Number*/countAll)
	{
		if (window.console) console.log('Image loaded '+countLoaded+'/'+countAll);
	}
	
	// Load image resource of ObjectFactory-managed game objects
	bxg.ObjectFactory.load(['obj.cannon', 'obj.boss', 'obj.bossShot', 'obj.fighterShot', 'img.bush', 'img.crack', 'img.cannonBase'], onLoadObjects, onProgress);
	
}

function onLoadObjects(/*Number*/loaded, /*Number*/failed)
{
	// Example to get a progress status of image loading
	function onProgress(/*Number*/countLoaded, /*Number*/countAll)
	{
		if (window.console) console.log('Image loaded '+countLoaded+'/'+countAll);
	}
	
	// Load image resouce for non-ObjectFactory-created Objects and Image objects (and HTML)
	// This is asynchronous function
	bxg.imageLoader.load(
		{
			fighterC:{url:'imgs/fighter/center$$.png', count:2, start:1}
			,fighterL1_:{url:'imgs/fighter/left1_$$.png', count:2, start:1}
			,fighterL2_:{url:'imgs/fighter/left2_$$.png', count:2, start:1}
			,fighterL3_:{url:'imgs/fighter/left3_$$.png', count:2, start:1}
			,fighterL4_:{url:'imgs/fighter/left4_$$.png', count:2, start:1}
			,fighterR1_:{url:'imgs/fighter/right1_$$.png', count:2, start:1}
			,fighterR2_:{url:'imgs/fighter/right2_$$.png', count:2, start:1}
			,fighterR3_:{url:'imgs/fighter/right3_$$.png', count:2, start:1}
			,fighterR4_:{url:'imgs/fighter/right4_$$.png', count:2, start:1}
			,bullet:{url:'imgs/shot/cannon.png'}
			,background:{url:'imgs/bg/desert/bg.jpg'}
		},
		onReady, onProgress
	);
}

function onReady(/*Number*/loaded, /*Number*/failed)
{
	bxg.g.ctlLand = new bxg.C1WayBufferedScrollControl(IScrollManager, {size:bxg.c.scrSize.h*bxg.c.countPane, dir:'down'}, 'Land').create();
	bxg.g.ctlSky = new bxg.CControl(ISkyControlManager, {zIndex:1}, 'Sky').create();
	
	// Create and add player object
	// not by Object-factory
	bxg.player = bxg.g.ctlSky.add(
		new bxg.CObject(
			'fighter'
			,{
				center:{sprite:['fighterC1', 'fighterC2'], offset:{x:0, y:-4}}
				,left0:{sprite:['fighterL1_1', 'fighterL1_2', 'fighterL2_1', 'fighterL2_2', 'fighterL3_1', 'fighterL3_2']}
				,left1:{sprite:['fighterL4_1', 'fighterL4_2']}
				,right0:{sprite:['fighterR1_1', 'fighterR1_2', 'fighterR2_1', 'fighterR2_2', 'fighterR3_1', 'fighterR3_2']}
				,right1:{sprite:['fighterR4_1', 'fighterR4_2']}
			}
			,{
				manager:IFighterManager
				,cdShape:[{rect:{x:8, y:43, w:71, h:26}}, {rect:{x:34, y:10, w:19, h:73}}]
				,zIndex:20
			}	
		).create()
	);
		
	// Create Enemy's shot and put into CObjectPool
	// not by Object-factory
	bxg.g.poolBullet = new bxg.CObjectPool();
	
	for(i = 0; i < bxg.c.countBullet; i ++){
		bxg.g.poolBullet.add(
			new bxg.CObject(
				'obj.bullet'
				,{
					normal:{sprite:['bullet']}
				}
				,{
					manager:IBulletManager
					,cdShape:[{circle:{x:7, y:7, r:7}}]
					,zIndex:1
				}
			).create()
		);
	}
	bxg.g.poolBullet.addToControl(bxg.g.ctlSky);
	
	// Create Enemy boss's shot and put into CObjectPool
	bxg.g.poolBulletBoss = new bxg.CObjectPool();
	for(i = 0; i < bxg.c.countBulletBoss; i ++){
		bxg.g.poolBulletBoss.add(bxg.ObjectFactory.build('obj.bossShot'));
	}
	bxg.g.poolBulletBoss.addToControl(bxg.g.ctlSky);
	
	// Create Fighter's shot and put into CObjectPool
	bxg.g.poolBulletFighter = new bxg.CObjectPool();
	for(i = 0; i < bxg.c.countBulletFighter; i ++){
		bxg.g.poolBulletFighter.add(bxg.ObjectFactory.build('obj.fighterShot'));
	}
	bxg.g.poolBulletFighter.addToControl(bxg.g.ctlSky);
	
	// Add input device
	//   CAccelerometerDevice and CTapDevice for touch device
	//   CKeyDevice for PC
	if (bx.HCL.DV.hasTouchEvent()){
		bxg.game.addInputDevice(new bxg.CAccelerometerDevice({
				moveLeft:{x:{max:-1, min:-10}, type:'event'},
				moveRight:{x:{max:10, min:1}, type:'event'}
			})
		);
		
		bxg.game.addInputDevice(new bxg.CTapDevice({
				fireShot:{area:{x:0, y:0, w:bxg.area.w, h:bxg.area.h}, type:'event'}
			})
		);
	}
	else{
		bxg.game.addInputDevice(new bxg.CKeyDevice(
			{
				moveLeft:{key:'keyLeft', type:'polling'}
				,moveRight:{key:'keyRight', type:'polling'}
				,fireShot:{key:'keyZ', type:'event'}
				,errorIME:{key:'keyErrorIME', type:'event'}
			}
			,{multi:true}
		));
	}

	// Turn off waiting-box
	bx.UX.waitBox(false);
	
	// Game start
	bxg.game.init({tick:bxg.c.tick});
	bxg.game.addControl(bxg.g.ctlLand);
	bxg.game.addControl(bxg.g.ctlSky);
	bxg.game.run();
	
	bxg.Inspector.createConsole({consolePerformanceFull:true, consoleObjectFactory:true, consoleRenderer:true});
}

