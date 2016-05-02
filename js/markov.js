var corpus;
var dict = {};
var endWords = {};
var startWords = [];
var order = 2;
var min_words =20;


function readSingleFile(evt) {
    //Retrieve the first (and only!) File from the FileList object
    var f = evt.target.files[0]; 

    if (f) {
      var r = new FileReader();
      r.onload = function(e) { 
          var contents = e.target.result;
          corpus = contents;
          corpus = corpus.replace(/\s+/g, ' ').trim();
          createDict();
      }
      r.readAsText(f, 'ISO-8859-1');
    } else { 
        alert('Failed to load file');
    }
}

var createDict = function(){
    if (order == 1)
        createDict1()
    else
        createDict2()
}

var createDict2 = function(){
    dict = {}
    var words = corpus.split(' ');
    for (var i = 0; i < words.length - 2; i++) {
        if (words[i].charAt([words[i].length-1]) == '.' || words[i].charAt([words[i].length-1]) == '?'|| words[i].charAt([words[i].length-1]) == '!'|| words[i].charAt([words[i].length-1]) == ')'){
            endWords[words[i]] = true;
            startWords.push([words[i+1],words[i+2]]);
        }

        if ( words[i] in dict && words[i+1] in dict[words[i]] ) {
            dict[words[i]][words[i+1]].push(words[i+2])
        } 
        else {
            if (dict[words[i]]== undefined){
             dict[words[i]] ={}
            }
            dict[words[i]][words[i+1]] = [words[i+2]]
        }    
    }
}

var createDict1 = function(){
    var words = corpus.split(' ');
    for (var i = 0; i < words.length - 1; i++) {
        if (words[i].charAt([words[i].length-1]) == '.' || words[i].charAt([words[i].length-1]) == '?'|| words[i].charAt([words[i].length-1]) == '!'|| words[i].charAt([words[i].length-1]) == ')'){
            endWords[words[i]] = true;
            startWords.push(words[i+1]);
        }

        if ( words[i] in dict) {
            dict[words[i]].push(words[i+1])
        } 
        else {
            dict[words[i]] = [words[i+1]]
        }    
    }
    console.log(dict);
    console.log(endWords);  
}

var choice = function (a) {
    var i = Math.floor(a.length * getRandomFloat(0,1));
    return a[i];
}



var make_post_order2 = function (min_length) {
    var w = choice(startWords);
    word = w[0];
    word2 = w[1]
    var phrase = [word,word2];

    var p1 = phrase[phrase.length-2];
    var p2 = phrase[phrase.length-1];

    while (p1 in dict && p2 in dict[p1]) {

        var next_words = dict[p1][p2];
        word = choice(next_words);
        phrase.push(word)

        p1 = phrase[phrase.length-2];
        p2 = phrase[phrase.length-1];

        if (phrase.length > min_length && endWords.hasOwnProperty(word))  break;
    }
    if (phrase.length < min_length) return make_post(min_length);
    return phrase.join(' ');
}

var make_post_order1 = function (min_length) {
    word = choice(startWords);
    var phrase = [word];
    while (dict.hasOwnProperty(word)) {
        var next_words = dict[word];
        word = choice(next_words);
        phrase.push(word);
        if (phrase.length > min_length && endWords.hasOwnProperty(word)) break;
    }
    if (phrase.length < min_length) return make_post(min_length);
    return phrase.join(' ');
}


var make_post = function(min_length){
    if (order == 1)
        return make_post_order1(min_length);
    else 
        return make_post_order2(min_length);
}



