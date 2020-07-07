var through = require('through2')
var styleByEscapeCode = require('./styleByEscapeCode.js')

function inliner(style) {
    return Object.keys(style).map(function(k) {
	if (style[k]) {
	    return k + ': ' + style[k] + ';'
	}
    }).join(' ')
}

function classifier(style, prefix) {
    return Object.keys(style).map(function(k) {
	if (style[k]) {
	    return prefix + k + '-' + style[k]
	}
    }).join(' ')
}

function getReplacer(opts) {
    return function replaceColor(match, offset, str) {
	var res = ""
	var styles = match.slice(2, -1).split(';').map(styleByEscapeCode)

        var breakers = []
        var colors = []

        styles.forEach(function(style) {
            if (style.breaker) breakers.push(style)
            else colors.push(style)
        })

	if (breakers.length && opts.remains > 0) {
	    res += "</span>".repeat(breakers.length)
	    opts.remains -= breakers.length
	}

	if (colors.length) {
            var color = colors.reduce(function(color, style) {
                for (var k in style) {
                    color[k] = style[k] || color[k]
                }
                return color
            }, {})

	    res += '<span ' +
                (opts.style === 'inline'
                 ? 'style="' + inliner(color)
                 : 'class="' + classifier(color, opts.prefix))
                + '">'
	    opts.remains += 1
	}

	return res;
    }
}



module.exports = function(opts) {
  var rg = new RegExp("\u001b\\[[0-9;]*m", 'g')
  var newline = new RegExp('\n+', 'g')

    opts = opts || {}
    opts.style = opts.style === 'class' ? 'class' : 'inline'
    opts.prefix = opts.prefix || 'ansi2html-'
    opts.remains = 0

    var replacer = getReplacer(opts)


    function onEnd(done) {
	if (opts.remains) {
	    this.push('</span>'.repeat(opts.remains))
	    opts.remains = 0
	}
	done()
    }

    function onChunk(buf, _, next) {
      this.push(buf.toString().replace(rg, replacer).replace(newline, '<br/>'))
	next()
    }

    return through(onChunk, onEnd)
}
