G.AddData({
	name:'Upgraded default dataset',
	author:'m9uts',
	desc:'',
	engineVersion:1,
	manifest:0,
	requires:['Default dataset*'],
	func:function(){
		/*=====================================================================================
		FIXES
		=======================================================================================*/
		
		/*=====================================================================================
		RESOURCES
		=======================================================================================*/
		
		new G.Res({
			name:'heat',
			displayName:'Heat',
			desc:'Keeps your tribe warm; each heat reduces illness for 1 people.//Used by some types of crafting.//Will cool over time.',
			icon:[0,0],
			replacement:'fire pit',
			tick:function(me,tick)
			{
				//if (me.replacement) me.hidden=true; else me.hidden=false;
				var toSpoil=me.amount*0.001;
				var spent=G.lose(me.name,randomFloor(toSpoil),'decay');
			}
		});
		
		/*=====================================================================================
		RESOURCES
		=======================================================================================*/

		new G.Tech({
			name:'advancent-fire-sources',
			desc:'@unlocks [heat]<>[heat] replaces [fire pit]s and does the same thing but only keeps one person warm.',
			icon:[0,0],
			cost:{'insight':25},
			req:{'stone-knapping':true, 'fire-making':true},
			effects:[
				{'type':'function', func:function(){G.getDict('fipe pit').hidden=true; G.getDict('heat').hidden=false}}
			],
			chance:3,
		});
	}
});
