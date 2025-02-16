G.AddData({
	name:'Upgraded default dataset',
	author:'m9uts',
	desc:'',
	engineVersion:1,
	manifest:0,
	requires:['Default dataset*'],
	func:function(){
		
		/*=====================================================================================
		RESOURCES
		=======================================================================================*/
		
		new G.Res({
			name:'heat',
			displayName:'Heat',
			desc:'Keeps your tribe warm; each heat reduces illness for 1 people.//Used by some types of crafting.//Will decay over time.',
			icon:[0,0],
			tick:function(me,tick)
			{
				var toSpoil=me.amount*0.001;
				var spent=G.lose(me.name,randomFloor(toSpoil),'decay');
			}
		});
		//G.getDict('fire pit').replacement='heat';
		G.getDict('fire pit').tick=function(me,tick){
			if (G.has('advancent fire sources')) me.hidden=true; else me.hidden=false;
			var toSpoil=me.amount*0.01;
			var spent=G.lose(me.name,randomFloor(toSpoil),'decay');
		};
		
		/*=====================================================================================
		RESOURCES
		=======================================================================================*/

		new G.Tech({
			name:'advancent fire sources',
			desc:'@unlocks [heat]<>[heat] replaces [fire pit]s and does the same thing but only keeps one person warm.',
			icon:[0,0],
			cost:{'insight':10},
			req:{'fire-making':true,'cities':true},
			effects:[
				{'type':'function',func:function(){
					G.getDict('firekeeper').modes[0]['desc']='Make 10 [heat] from 20 [stick]s each.';
					G.getDict('firekeeper').effects[0]['into']={'heat':10};
					G.getDict('firekeeper').modes[1]['desc']='Turn [meat] and [seafood] into [cooked meat] and [cooked seafood] with [heat]';
				 	G.getDict('firekeeper').effects[1]['from']={'meat':1,'heat':0.01};
					G.getDict('firekeeper').effects[2]['from']={'seafood':1,'heat':0.01};
					G.getDict('firekeeper').modes[2]['desc']='Turn 1 [meat] or [seafood] into 2 [cured meat] or [cured seafood] using [salt] with [heat]';
					G.getDict('firekeeper').effects[3]['from']={'meat':1,'salt':1,'heat':0.01};
					G.getDict('firekeeper').effects[4]['from']={'seafood':1,'salt':1,'heat':0.01};

					G.getDict('potter').modes[0]['desc']='Craft [pot]s from 3 [clay] each; requires [heat].';
					G.getDict('potter').effects[0]['from']={'clay':3,'heat':0.01};
					G.getDict('firekeeper').modes[1]['desc']='Craft [pot]s from 10 [mud] each; requires [heat].';
					G.getDict('potter').effects[1]['from']={'mud':10',heat':0.01};
				}
			],
			chance:3,
		});

		/*=====================================================================================
		POPULATION FIX
		=======================================================================================*/

		G.props['clothesThings']={'basic clothes':[0.1,0.1],'primitive clothes':[0,0]};
		G.props['warmThings']={'fire pit':[10,0.1,0.1],'heat':[1,0.1,0.1]};
		
		G.getDict('population').tick=function(me,tick){
			//this.displayName=G.getName('inhabs');
			
			if (me.amount>0)
			{
				//note : we also sneak in some stuff unrelated to population here
				//policy ticks
				if (tick%50==0)
				{
					var rituals=['fertility rituals','harvest rituals','flower rituals','wisdom rituals'];
					for (var i in rituals)
					{
						if (G.checkPolicy(rituals[i])=='on')
						{
							if (G.getRes('faith').amount<=0) G.setPolicyModeByName(rituals[i],'off');
							else G.lose('faith',1,'rituals');
						}
					}
				}
				
				var productionMult=G.doFunc('production multiplier',1);
				
				var deathUnhappinessMult=1;
				if (G.has('fear of death')) deathUnhappinessMult*=2;
				if (G.has('belief in the afterlife')) deathUnhappinessMult/=2;
				if (tick%3==0 && G.checkPolicy('disable eating')=='off')
				{
					//drink water
					var toConsume=0;
					var weights={'baby':0.1,'child':0.3,'adult':0.5,'elder':0.5,'sick':0.4,'wounded':0.4};
					for (var i in weights)
					{toConsume+=G.getRes(i).amount*weights[i];}
					var rations=G.checkPolicy('water rations');
					if (rations=='none') {toConsume=0;G.gain('happiness',-me.amount*3,'water rations');G.gain('health',-me.amount*2,'water rations');}
					else if (rations=='meager') {toConsume*=0.5;G.gain('happiness',-me.amount*1,'water rations');G.gain('health',-me.amount*0.5,'water rations')}
					else if (rations=='plentiful') {toConsume*=1.5;G.gain('happiness',me.amount*1,'water rations');}
					toConsume=randomFloor(toConsume);
					var lacking=toConsume-G.lose('water',toConsume,'drinking');
					if (rations=='none') lacking=me.amount*0.5;
					if (lacking>0)//are we out of water?
					{
						//resort to muddy water
						if (rations!='none' && G.checkPolicy('drink muddy water')=='on') lacking=lacking-G.lose('muddy water',lacking,'drinking');
						if (lacking>0 && G.checkPolicy('disable aging')=='off')//are we also out of muddy water?
						{
							G.gain('happiness',-lacking*5,'no water');
							//die off
							var toDie=(lacking/5)*0.05;
							if (G.year<1) toDie/=5;//less deaths in the first year
							var died=0;
							var weights={'baby':0.1,'child':0.2,'adult':0.5,'elder':1,'sick':0.3,'wounded':0.3};//the elderly are the first to starve off
							var sum=0;for (var i in weights){sum+=weights[i];}for (var i in weights){weights[i]/=sum;}//normalize
							for (var i in weights){var ratio=(G.getRes(i).amount/me.amount);weights[i]=ratio+(1-ratio)*weights[i];}
							for (var i in weights)
							{var n=G.lose(i,randomFloor((Math.random()*0.8+0.2)*toDie*weights[i]),'dehydration');died+=n;}
							G.gain('corpse',died,'dehydration');
							G.gain('happiness',-died*20*deathUnhappinessMult,'dehydration');
							G.getRes('died this year').amount+=died;
							if (died>0) G.Message({type:'bad',mergeId:'diedDehydration',textFunc:function(args){return B(args.died)+' '+(args.died==1?'person':'people')+' died from dehydration.';},args:{died:died},icon:[5,4]});
						}
					}
					
					//eat food
					var toConsume=0;
					var consumeMult=1;
					var happinessAdd=0;
					if (G.has('culture of moderation')) {consumeMult*=0.85;happinessAdd-=0.1;}
					else if (G.has('joy of eating')) {consumeMult*=1.15;happinessAdd+=0.1;}
					var weights={'baby':0.2,'child':0.5,'adult':1,'elder':1,'sick':0.75,'wounded':0.75};
					for (var i in weights)
					{toConsume+=G.getRes(i).amount*weights[i];}
					var rations=G.checkPolicy('food rations');
					if (rations=='none') {toConsume=0;G.gain('happiness',-me.amount*3,'food rations');G.gain('health',-me.amount*2,'food rations');}
					else if (rations=='meager') {toConsume*=0.5;G.gain('happiness',-me.amount*1,'food rations');G.gain('health',-me.amount*0.5,'food rations');}
					else if (rations=='plentiful') {toConsume*=1.5;G.gain('happiness',me.amount*1,'food rations');}
					toConsume=randomFloor(toConsume*consumeMult);
					var consumed=G.lose('food',toConsume,'eating');
					G.gain('happiness',G.lose('salt',randomFloor(consumed*0.1),'eating')*5,'salting food');//use salt
					G.gain('happiness',consumed*happinessAdd,'food culture');
					var lacking=toConsume-consumed;
					if (rations=='none') lacking=me.amount*1;
					
					if (lacking>0)//are we out of food?
					{
						//resort to spoiled food
						if (rations!='none' && G.checkPolicy('eat spoiled food')=='on') lacking=lacking-G.lose('spoiled food',lacking,'eating');
						if (lacking>0 && G.checkPolicy('disable aging')=='off')//are we also out of spoiled food?
						{
							G.gain('happiness',-lacking*5,'no food');
							//die off
							var toDie=(lacking/5)*0.05;
							if (G.year<1) toDie/=5;//less deaths in the first year
							var died=0;
							var weights={'baby':0.1,'child':0.2,'adult':0.5,'elder':1,'sick':0.3,'wounded':0.3};//the elderly are the first to starve off
							var sum=0;for (var i in weights){sum+=weights[i];}for (var i in weights){weights[i]/=sum;}//normalize
							for (var i in weights){var ratio=(G.getRes(i).amount/me.amount);weights[i]=ratio+(1-ratio)*weights[i];}
							for (var i in weights)
							{var n=G.lose(i,randomFloor((Math.random()*0.8+0.2)*toDie*weights[i]),'starvation');died+=n;}
							G.gain('corpse',died,'starvation');
							G.gain('happiness',-died*20*deathUnhappinessMult,'starvation');
							G.getRes('died this year').amount+=died;
							if (died>0) G.Message({type:'bad',mergeId:'diedStarvation',textFunc:function(args){return B(args.died)+' '+(args.died==1?'person':'people')+' died from starvation.';},args:{died:died},icon:[5,4]});
						}
					}
				}
				
				//clothing
				var objects=G.props['clothesThings'];
				var leftout=me.amount;
				var prev=leftout;
				var fulfilled=0;
				for (var i in objects)
				{
					fulfilled=Math.min(me.amount,Math.min(G.getRes(i).amount,leftout));
					G.gain('happiness',fulfilled*objects[i][0],'clothing');
					G.gain('health',fulfilled*objects[i][1],'clothing');
					leftout-=fulfilled;
				}
				G.gain('happiness',-leftout*0.15,'no clothing');
				G.gain('health',-leftout*0.15,'no clothing');
				
				//fire
				var objects=G.props['warmThings'];
				var leftout=me.amount;
				var prev=leftout;
				var fulfilled=0;
				for (var i in objects)
				{
					fulfilled=Math.min(me.amount,Math.min(G.getRes(i).amount*objects[i][0],leftout));
					G.gain('happiness',fulfilled*objects[i][1],'warmth & light');
					G.gain('health',fulfilled*objects[i][2],'warmth & light');
					leftout-=fulfilled;
				}
				G.gain('happiness',-leftout*0.1,'cold & darkness');
				G.gain('health',-leftout*0.1,'cold & darkness');
				
				//homelessness
				var homeless=Math.max(0,(me.amount)-G.getRes('housing').amount);
				if (G.has('sedentism') && me.amount>15 && homeless>0)
				{
					if (tick%10==0) G.Message({type:'bad',mergeId:'homeless',textFunc:function(args){return B(args.n)+' '+(args.n==1?'person is':'people are')+' homeless.<br>Homelessness with more than 15 population leads to lower birth rates.';},args:{n:homeless},replaceOnly:true,icon:[12,4]});
				}
				
				//age
				if (G.checkPolicy('disable aging')=='off')
				{
					if (G.year>=10)//no deaths of old age the first 10 years
					{
						var n=randomFloor(G.getRes('elder').amount*0.00035);
						G.gain('corpse',n,'old age');
						G.lose('elder',n,'old age');
						G.gain('happiness',-n*5*deathUnhappinessMult,'death');
						if (n>0) G.Message({type:'bad',mergeId:'diedAge',textFunc:function(args){return B(args.n)+' '+(args.n==1?'person':'people')+' died of old age.';},args:{n:n},icon:[13,4]});
						
						G.getRes('died this year').amount+=n;
					}
					if (G.year>=5)//no aging adults the first 5 years
					{
						var n=randomFloor(G.getRes('adult').amount*0.0002);
						G.gain('elder',n,'-');G.lose('adult',n,'aging up');
					}
					var n=randomFloor(G.getRes('child').amount*0.002);G.gain('adult',n,'aging up');G.lose('child',n,'aging up');
					var n=randomFloor(G.getRes('baby').amount*0.005);G.gain('child',n,'aging up');G.lose('baby',n,'aging up');
					
					//births
					var parents=G.getRes('adult').amount+G.getRes('elder').amount;
					if (parents>=2)//can't make babies by yourself
					{
						var born=0;
						var birthRate=1;
						if (me.amount<100) birthRate*=3;//more births if low pop
						if (me.amount<10) birthRate*=3;//even more births if very low pop
						if (G.checkPolicy('fertility rituals')=='on') birthRate*=1.2;
						if (G.checkPolicy('population control')=='forbidden') birthRate*=0;
						else if (G.checkPolicy('population control')=='limited') birthRate*=0.5;
						birthRate*=productionMult;
						if (homeless>0 && me.amount>15) birthRate*=0.05;//harder to make babies if you have more than 15 people and some of them are homeless
						var n=randomFloor(G.getRes('adult').amount*0.0003*birthRate);G.gain('baby',n,'birth');G.gain('happiness',n*10,'birth');born+=n;
						var n=randomFloor(G.getRes('elder').amount*0.00003*birthRate);G.gain('baby',n,'birth');G.gain('happiness',n*10,'birth');born+=n;
						G.getRes('born this year').amount+=born;
						if (born>0) G.Message({type:'good',mergeId:'born',textFunc:function(args){return B(args.born)+' '+(args.born==1?'baby has':'babies have')+' been born.';},args:{born:born},icon:[2,3]});
					}
					
					//health (diseases and wounds)
					//note : when a sick or wounded person recovers, they turn into adults; this means you could get a community of old people fall sick, then miraculously age back. life is a mystery
					
					//sickness
					var toChange=0.00003;
					if (G.getRes('health').amount<0)
					{
						toChange*=(1+Math.abs(G.getRes('health').amount/me.amount));
					}
					if (toChange>0)
					{
						if (G.year<5) toChange*=0.5;//less disease the first 5 years
						if (me.amount<=15) toChange*=0.5;
						if (G.checkPolicy('flower rituals')=='on') toChange*=0.8;
						var changed=0;
						var weights={'baby':2,'child':1.5,'adult':1,'elder':2};
						if (G.checkPolicy('child workforce')=='on') weights['child']*=2;
						if (G.checkPolicy('elder workforce')=='on') weights['elder']*=2;
						if (G.year<5) weights['adult']=0;//adults don't fall sick the first 5 years
						for (var i in weights)
						{var n=G.lose(i,randomFloor(Math.random()*G.getRes(i).amount*toChange*weights[i]),'-');changed+=n;}
						G.gain('sick',changed,'disease');
						if (changed>0) G.Message({type:'bad',mergeId:'fellSick',textFunc:function(args){return B(args.n)+' '+(args.n==1?'person':'people')+' fell sick.';},args:{n:changed},icon:[6,3]});
					}
					//sickness : death and recovery
					var sickMortality=0.005;
					var changed=0;
					var n=G.lose('sick',randomFloor(Math.random()*G.getRes('sick').amount*sickMortality),'disease');G.gain('corpse',n,'disease');changed+=n;
					G.gain('happiness',-changed*15*deathUnhappinessMult,'death');
					G.getRes('died this year').amount+=changed;
					if (changed>0) G.Message({type:'bad',mergeId:'diedSick',textFunc:function(args){return B(args.n)+' '+(args.n==1?'person':'people')+' died from disease.';},args:{n:changed},icon:[5,4]});
					
					var sickHealing=0.01;
					if (G.checkPolicy('flower rituals')=='on') sickHealing*=1.2;
					var changed=0;
					var n=G.lose('sick',randomFloor(Math.random()*G.getRes('sick').amount*sickHealing),'healing');G.gain('adult',n,'-');changed+=n;
					G.gain('happiness',changed*10,'recovery');
					if (changed>0) G.Message({type:'good',mergeId:'sickRecovered',textFunc:function(args){return B(args.n)+' sick '+(args.n==1?'person':'people')+' got better.';},args:{n:changed},icon:[4,3]});
					
					//wounds
					var toChange=0.00003;
					if (toChange>0)
					{
						if (G.year<5) toChange*=0.5;//less wounds the first 5 years
						if (me.amount<=15) toChange*=0.5;
						var changed=0;
						var weights={'baby':2,'child':1.5,'adult':1,'elder':2};
						if (G.checkPolicy('child workforce')=='on') weights['child']*=3;
						if (G.checkPolicy('elder workforce')=='on') weights['elder']*=3;
						if (G.year<5) weights['adult']=0;//adults don't get wounded the first 5 years
						for (var i in weights)
						{var n=G.lose(i,randomFloor(Math.random()*G.getRes(i).amount*toChange*weights[i]),'-');changed+=n;}
						G.gain('wounded',changed,'accident');
						if (changed>0) G.Message({type:'bad',mergeId:'gotWounded',textFunc:function(args){return B(args.n)+' '+(args.n==1?'person':'people')+' got wounded.';},args:{n:changed},icon:[7,3]});
					}
					//wounds : death and recovery
					var woundMortality=0.005;
					var changed=0;
					var n=G.lose('wounded',randomFloor(Math.random()*G.getRes('wounded').amount*woundMortality),'wounds');G.gain('corpse',n,'wounds');changed+=n;
					G.gain('happiness',-changed*15*deathUnhappinessMult,'death');
					G.getRes('died this year').amount+=changed;
					if (changed>0) G.Message({type:'bad',mergeId:'diedWounded',textFunc:function(args){return B(args.n)+' '+(args.n==1?'person':'people')+' died from their wounds.';},args:{n:changed},icon:[5,4]});
					
					var sickHealing=0.005;
					var changed=0;
					var n=G.lose('wounded',randomFloor(Math.random()*G.getRes('wounded').amount*sickHealing),'healing');G.gain('adult',n,'-');changed+=n;
					G.gain('happiness',changed*10,'recovery');
					if (changed>0) G.Message({type:'good',mergeId:'woundedRecovered',textFunc:function(args){return B(args.n)+' '+(args.n==1?'person':'people')+' recovered from their wounds.';},args:{n:changed},icon:[4,3]});
				}
			}
			else if (G.T>0) {G.GameOver();}
		};
	}
});
