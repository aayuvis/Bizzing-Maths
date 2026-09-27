/* stories.js — a short story for every stop. The Bee books' treatment, for maths.

   Before a child meets a trick as steps, they meet it as a small story: two of
   the Bee's ten rivals, an ordinary place, a real-life sum, and one of them
   showing the other the shortcut. The characters are the SAME children the
   Bee's mock bee and this app's Mock Contest field, and each teaches the trick
   that already fits them — Rafi takes numbers apart, Mira knows her squares,
   Theo checks everything with nines, Ines does percentages, Kwame lives near a
   hundred, Vesper says very little and is right. Nothing is invented twice.

   Every story is fiction and says so ("A story"), the badge rule Bizzing India
   keeps: a thing told as a story is never presented as fact.

   THE NOTEPAD IS CHECKED. A beat may `add` a line to the notepad — `t` is the
   sum as written, `v` its value. test/stories.mjs evaluates every `t` and fails
   the build if it does not equal `v`. A story that did its own arithmetic
   wrong would undo the chapter it introduces.

   Beat shape: { who: <rival id> | null (narrator), say: 'line', add?: {t, v} }.
   `scene` names a painted plate in public/art/ (s-<scene>.webp). */

const CORE_STORIES = {
  /* ------------------------------------------------ The Ten Gardens */
  'make-ten': { title: "Pip's marbles", scene: 'garden', cast: ['pixel', 'koi'], beats: [
    { who: null, say: 'Pip has 8 marbles in a jar. Nova tips in 5 more.', add: { t: '8 + 5' } },
    { who: 'pixel', say: 'Eight… nine, ten, eleven, twelve… I ran out of fingers!' },
    { who: 'koi', say: 'Your jar wants to be ten. How many more does 8 need to make 10?' },
    { who: 'pixel', say: 'Two! So I pour 2 of your 5 in first.', add: { t: '8 + 2', v: 10 } },
    { who: 'koi', say: 'And how many of my five are still in my hand?', add: { t: '5 − 2', v: 3 } },
    { who: 'pixel', say: 'Ten and three more… thirteen! No fingers needed.', add: { t: '10 + 3', v: 13 } },
    { who: 'koi', say: 'Make ten first. Ten is the easiest number there is.', add: { t: '8 + 5', v: 13 } },
  ] },
  'near-doubles': { title: 'Two plates of sweets', scene: 'festival', cast: ['panda', 'pixel'], beats: [
    { who: null, say: 'A festival evening. Suki sets out 7 sweets on one plate and 8 on the other.', add: { t: '7 + 8' } },
    { who: 'pixel', say: 'How many altogether? I will count them one by one.' },
    { who: 'panda', say: 'No need. 7 and 8 are next-door numbers. Pretend both plates had 7.', add: { t: '7 + 7', v: 14 } },
    { who: 'pixel', say: 'But the second plate has one more than that.' },
    { who: 'panda', say: 'So the answer is one more than fourteen.', add: { t: '14 + 1', v: 15 } },
    { who: 'pixel', say: 'Fifteen! Double it, then one more.', add: { t: '7 + 8', v: 15 } },
  ] },
  'plus-nine': { title: 'The bus stop', scene: 'bus', cast: ['koi', 'comet'], beats: [
    { who: null, say: 'There are 34 people on the bus. At the next stop, 9 more climb on.', add: { t: '34 + 9' } },
    { who: 'comet', say: 'Thirty-five, thirty-six, thirty-seven…' },
    { who: 'koi', say: 'Too slow, Dax. Nine is one short of ten. Add ten — that is easy.', add: { t: '34 + 10', v: 44 } },
    { who: 'comet', say: 'But nine people got on, not ten.' },
    { who: 'koi', say: 'So take the extra one back off.', add: { t: '44 − 1', v: 43 } },
    { who: 'comet', say: 'Forty-three! Faster than counting heads.', add: { t: '34 + 9', v: 43 } },
  ] },
  'count-up': { title: 'The gap on the shelf', scene: 'library', cast: ['panda', 'beaker'], beats: [
    { who: null, say: 'The shelf holds 13 books. Rafi has put 8 back. How many are still missing?', add: { t: '13 − 8' } },
    { who: 'beaker', say: 'Thirteen take away eight… I will take them away one at a time.' },
    { who: 'panda', say: 'Go the other way. Start at 8 and count UP to 13.' },
    { who: 'panda', say: 'From 8 up to 10 is a small jump.', add: { t: '10 − 8', v: 2 } },
    { who: 'beaker', say: 'And from 10 up to 13 is another.', add: { t: '13 − 10', v: 3 } },
    { who: 'panda', say: 'Add the two jumps.', add: { t: '2 + 3', v: 5 } },
    { who: 'beaker', say: 'Five books missing. Taking away is really measuring a gap.', add: { t: '13 − 8', v: 5 } },
  ] },
  'tens-then-ones': { title: 'The cricket score', scene: 'cricket', cast: ['beaker', 'comet'], beats: [
    { who: null, say: 'First innings: 47 runs. Second innings: 36. Dax wants the total before the scoreboard changes.', add: { t: '47 + 36' } },
    { who: 'beaker', say: 'Take them apart. 47 is 40 and 7. 36 is 30 and 6.' },
    { who: 'beaker', say: 'The tens first — the big part.', add: { t: '40 + 30', v: 70 } },
    { who: 'comet', say: 'Then the ones.', add: { t: '7 + 6', v: 13 } },
    { who: 'beaker', say: 'Now put them back together.', add: { t: '70 + 13', v: 83 } },
    { who: 'comet', say: 'Eighty-three! Tens, then ones.', add: { t: '47 + 36', v: 83 } },
  ] },

  /* ------------------------------------------------ The Times Market */
  'double-double': { title: 'The egg boxes', scene: 'market', cast: ['koi', 'pixel'], beats: [
    { who: null, say: 'Nova buys 7 boxes of eggs at the market. Each box holds 8.', add: { t: '7 × 8' } },
    { who: 'pixel', say: 'Seven eights… that is the one I always forget!' },
    { who: 'koi', say: 'Most people do. But you can double, can’t you? Double 7.', add: { t: '7 × 2', v: 14 } },
    { who: 'pixel', say: 'Double again?', add: { t: '14 × 2', v: 28 } },
    { who: 'koi', say: 'And once more — eight is two, times two, times two.', add: { t: '28 × 2', v: 56 } },
    { who: 'pixel', say: 'Fifty-six eggs. Double, double, double!', add: { t: '7 × 8', v: 56 } },
  ] },
  'times-five': { title: 'The sticker stall', scene: 'fair', cast: ['comet', 'panda'], beats: [
    { who: null, say: 'Stickers cost 5 tokens each. Dax wants 14 of them.', add: { t: '14 × 5' } },
    { who: 'comet', say: 'Five, ten, fifteen, twenty…' },
    { who: 'panda', say: 'Five is half of ten. What would 14 tens be?', add: { t: '14 × 10', v: 140 } },
    { who: 'panda', say: 'Now halve it.', add: { t: '140 ÷ 2', v: 70 } },
    { who: 'comet', say: 'Seventy tokens. Times ten, then halve!', add: { t: '14 × 5', v: 70 } },
  ] },
  'times-nine': { title: 'Nine chairs a row', scene: 'hall', cast: ['scopey', 'koi'], beats: [
    { who: null, say: 'The school hall has 7 rows of chairs, with 9 chairs in each row.', add: { t: '7 × 9' } },
    { who: 'scopey', say: 'If every row had 10 chairs, there would be 70.', add: { t: '7 × 10', v: 70 } },
    { who: 'koi', say: 'But every row is one chair short.' },
    { who: 'scopey', say: 'Seven rows, one short each — so 7 chairs fewer.', add: { t: '70 − 7', v: 63 } },
    { who: 'koi', say: 'Sixty-three chairs.', add: { t: '7 × 9', v: 63 } },
    { who: 'scopey', say: 'And 6 and 3 make 9. Answers in the nine times table always add up to nine — that is my check.' },
  ] },
  'times-twelve': { title: 'Boxes of a dozen', scene: 'market', cast: ['beaker', 'melody'], beats: [
    { who: null, say: 'Mangoes come in boxes of 12. The stall has 7 boxes.', add: { t: '7 × 12' } },
    { who: 'melody', say: 'Twelves are the worst table.' },
    { who: 'beaker', say: 'Then split the box. Twelve is ten and two.' },
    { who: 'beaker', say: 'Seven tens…', add: { t: '7 × 10', v: 70 } },
    { who: 'melody', say: '…and seven twos.', add: { t: '7 × 2', v: 14 } },
    { who: 'beaker', say: 'Add them.', add: { t: '70 + 14', v: 84 } },
    { who: 'melody', say: 'Eighty-four mangoes. Two easy sums instead of one hard one.', add: { t: '7 × 12', v: 84 } },
  ] },
  'times-eleven': { title: 'The carriage game', scene: 'train', cast: ['samurai', 'pixel'], beats: [
    { who: null, say: 'On the train to see their grandmother, Kwame and Pip play a game: multiply the carriage number by 11.' },
    { who: 'pixel', say: 'Carriage 43! Forty-three times eleven is… um…', add: { t: '43 × 11' } },
    { who: 'samurai', say: 'Pull the 4 and the 3 apart, and put their sum in the middle.', add: { t: '4 + 3', v: 7 } },
    { who: 'samurai', say: 'Four, seven, three.', add: { t: '43 × 11', v: 473 } },
    { who: 'pixel', say: 'Carriage 78! Seven and eight is fifteen — that won’t fit in the middle.', add: { t: '7 + 8', v: 15 } },
    { who: 'samurai', say: 'Keep the 5 in the middle and carry the 1 onto the 7. Eight, five, eight.', add: { t: '78 × 11', v: 858 } },
    { who: 'pixel', say: 'That is my new party trick.' },
  ] },

  /* ------------------------------------------------ The Mental Workshop */
  'round-add': { title: 'The money box', scene: 'kitchen', cast: ['comet', 'panda'], beats: [
    { who: null, say: 'Dax has saved 47 coins. His grandmother gives him 38 more.', add: { t: '47 + 38' } },
    { who: 'panda', say: '38 is nearly 40. Add 40 instead.', add: { t: '47 + 40', v: 87 } },
    { who: 'comet', say: 'But she didn’t give me 40.' },
    { who: 'panda', say: 'So you added 2 too many. Give them back.', add: { t: '87 − 2', v: 85 } },
    { who: 'comet', say: 'Eighty-five. Round it, then fix it.', add: { t: '47 + 38', v: 85 } },
  ] },
  'round-sub': { title: 'Stepping stones', scene: 'pond', cast: ['melody', 'scopey'], beats: [
    { who: null, say: 'There are 83 stepping stones across the pond. Ines has hopped across 29.', add: { t: '83 − 29' } },
    { who: 'scopey', say: 'Eighty-three take away twenty-nine means borrowing. I hate borrowing.' },
    { who: 'melody', say: 'Take away 30 instead. No borrowing.', add: { t: '83 − 30', v: 53 } },
    { who: 'melody', say: 'We took one stone too many — put it back.', add: { t: '53 + 1', v: 54 } },
    { who: 'scopey', say: 'Fifty-four to go. And I checked it backwards.', add: { t: '29 + 54', v: 83 } },
  ] },
  'split-multiply': { title: 'The bake sale', scene: 'kitchen', cast: ['beaker', 'koi'], beats: [
    { who: null, say: 'For the bake sale there are 7 tins, with 46 biscuits in each.', add: { t: '7 × 46' } },
    { who: 'beaker', say: '46 is 40 and 6. Two small jobs instead of one big one.' },
    { who: 'beaker', say: 'Seven forties first.', add: { t: '7 × 40', v: 280 } },
    { who: 'koi', say: 'Then seven sixes.', add: { t: '7 × 6', v: 42 } },
    { who: 'beaker', say: 'Put them together.', add: { t: '280 + 42', v: 322 } },
    { who: 'koi', say: '322 biscuits. Like cutting one big tray into two easy trays.', add: { t: '7 × 46', v: 322 } },
  ] },
  'times-25': { title: 'The ride tokens', scene: 'fair', cast: ['melody', 'comet'], beats: [
    { who: null, say: 'Every ride at the fair costs 25 tokens. Ines’s class went on 36 rides.', add: { t: '36 × 25' } },
    { who: 'comet', say: 'Thirty-six twenty-fives?!' },
    { who: 'melody', say: 'Four 25s make 100. So how many fours are there in 36?', add: { t: '36 ÷ 4', v: 9 } },
    { who: 'melody', say: 'Each four rides is a hundred tokens.', add: { t: '9 × 100', v: 900 } },
    { who: 'comet', say: 'Nine hundred tokens!', add: { t: '36 × 25', v: 900 } },
  ] },
  'halve-double': { title: 'The tiled floor', scene: 'room', cast: ['panda', 'scopey'], beats: [
    { who: null, say: 'A new floor: 16 rows of tiles, with 35 tiles in each row.', add: { t: '16 × 35' } },
    { who: 'scopey', say: 'Neither of those numbers is friendly.' },
    { who: 'panda', say: 'Cut the floor in half and put the halves end to end. Half as many rows…', add: { t: '16 ÷ 2', v: 8 } },
    { who: 'panda', say: '…each twice as long.', add: { t: '35 × 2', v: 70 } },
    { who: 'scopey', say: 'Eight seventies — that one I can do.', add: { t: '8 × 70', v: 560 } },
    { who: 'panda', say: 'Same tiles, same floor. Just rearranged.', add: { t: '16 × 35', v: 560 } },
  ] },

  /* ------------------------------------------------ The Sutra Observatory */
  'square-five': { title: "Mira's square flowerbed", scene: 'garden', cast: ['astro', 'comet'], beats: [
    { who: null, say: 'Mira is planting a square flowerbed: 35 bulbs along each side.', add: { t: '35 × 35' } },
    { who: 'comet', say: 'Thirty-five times thirty-five. Somebody get a calculator.' },
    { who: 'astro', say: 'No need. The front digit is 3, and one more than 3 is 4.', add: { t: '3 × 4', v: 12 } },
    { who: 'astro', say: 'Now write 25 after it.', add: { t: '35 × 35', v: 1225 } },
    { who: 'comet', say: '1225 bulbs! Does that always work?' },
    { who: 'astro', say: 'For every number that ends in 5. The Observatory will show you why.' },
  ] },
  'nikhilam-10': { title: 'The lantern crates', scene: 'night', cast: ['samurai', 'pixel'], beats: [
    { who: null, say: 'Pip is stacking 8 crates for the night fair. Each crate holds 7 lanterns.', add: { t: '8 × 7' } },
    { who: 'samurai', say: 'Both are close to 10. How far short is each?', add: { t: '10 − 8', v: 2 } },
    { who: 'pixel', say: 'And 7 is this far short.', add: { t: '10 − 7', v: 3 } },
    { who: 'samurai', say: 'Cross over: take the other number’s gap from 8. That gives the tens.', add: { t: '8 − 3', v: 5 } },
    { who: 'samurai', say: 'Multiply the two gaps. That gives the ones.', add: { t: '2 × 3', v: 6 } },
    { who: 'pixel', say: 'Five tens and six… fifty-six lanterns!', add: { t: '8 × 7', v: 56 } },
  ] },
  'nikhilam-100': { title: 'The stadium race', scene: 'stadium', cast: ['samurai', 'goldlegend'], beats: [
    { who: null, say: 'The stadium has 97 rows, with 96 seats in every row. Kwame and Vesper race to count them.', add: { t: '97 × 96' } },
    { who: 'samurai', say: '97 is 3 short of a hundred.', add: { t: '100 − 97', v: 3 } },
    { who: 'samurai', say: '96 is 4 short.', add: { t: '100 − 96', v: 4 } },
    { who: 'samurai', say: 'Cross over: 97 take away 4. That is the hundreds.', add: { t: '97 − 4', v: 93 } },
    { who: 'samurai', say: 'Multiply the gaps for the last two digits.', add: { t: '3 × 4', v: 12 } },
    { who: 'goldlegend', say: 'Nine thousand three hundred and twelve.', add: { t: '97 × 96', v: 9312 } },
    { who: 'samurai', say: 'You were ahead of me again.' },
  ] },
  'above-100': { title: 'The sticker order', scene: 'library', cast: ['scopey', 'samurai'], beats: [
    { who: null, say: 'The school orders 104 packs of stickers, with 107 stickers in each pack.', add: { t: '104 × 107' } },
    { who: 'scopey', say: 'Both are just ABOVE a hundred this time.' },
    { who: 'samurai', say: 'Then we add across instead of taking away. How far over is each?', add: { t: '107 − 100', v: 7 } },
    { who: 'samurai', say: '104 plus the other one’s 7 — that is the hundreds.', add: { t: '104 + 7', v: 111 } },
    { who: 'scopey', say: 'And 4 over times 7 over for the end.', add: { t: '4 × 7', v: 28 } },
    { who: 'scopey', say: '11,128 stickers.', add: { t: '104 × 107', v: 11128 } },
  ] },
  'all-from-nine': { title: 'A thousand points', scene: 'shop', cast: ['melody', 'pixel'], beats: [
    { who: null, say: 'Pip needs 1000 points for a prize kite, and has 357 so far.', add: { t: '1000 − 357' } },
    { who: 'pixel', say: 'Take away from a thousand? That is borrowing three times!' },
    { who: 'melody', say: 'All from nine, and the last from ten. First digit: 9 take away 3.', add: { t: '9 − 3', v: 6 } },
    { who: 'pixel', say: 'Next: 9 take away 5.', add: { t: '9 − 5', v: 4 } },
    { who: 'melody', say: 'The last one from ten.', add: { t: '10 − 7', v: 3 } },
    { who: 'pixel', say: 'Six, four, three. 643 to go — no borrowing at all!', add: { t: '1000 − 357', v: 643 } },
  ] },
  'crosswise': { title: 'One line', scene: 'night', cast: ['goldlegend', 'astro'], beats: [
    { who: null, say: 'Contest practice. The question is 23 × 41. Vesper writes a single line.', add: { t: '23 × 41' } },
    { who: 'goldlegend', say: 'Units first: 3 times 1.', add: { t: '3 × 1', v: 3 } },
    { who: 'goldlegend', say: 'Crosswise: 2 times 1, plus 3 times 4.', add: { t: '2 × 1 + 3 × 4', v: 14 } },
    { who: 'goldlegend', say: 'Write the 4, carry the 1. Tens: 2 times 4, plus the carry.', add: { t: '2 × 4 + 1', v: 9 } },
    { who: 'astro', say: 'Nine, four, three.', add: { t: '23 × 41', v: 943 } },
    { who: 'goldlegend', say: 'It is only the long-multiplication grid, done in your head.' },
  ] },
  'square-near-100': { title: 'Meeting in the middle', scene: 'night', cast: ['astro', 'samurai'], beats: [
    { who: null, say: 'Mira knows squares. Kwame knows the numbers near a hundred. Today’s question belongs to both of them: 96².', add: { t: '96 × 96' } },
    { who: 'samurai', say: '96 is 4 short of a hundred.', add: { t: '100 − 96', v: 4 } },
    { who: 'astro', say: 'Then go down another 4.', add: { t: '96 − 4', v: 92 } },
    { who: 'astro', say: 'And square the 4 for the last two digits.', add: { t: '4 × 4', v: 16 } },
    { who: 'samurai', say: 'Ninety-two hundred and sixteen.', add: { t: '96 × 96', v: 9216 } },
  ] },

  /* ------------------------------------------------ The Number Harbour */
  'digit-root': { title: 'Theo checks the till', scene: 'harbour', cast: ['scopey', 'comet'], beats: [
    { who: null, say: 'At the harbour stall, Dax works out 47 × 23 on paper and gets 1081.', add: { t: '47 × 23' } },
    { who: 'scopey', say: 'Let me check it. The digits of 47 add up to…', add: { t: '4 + 7', v: 11 } },
    { who: 'scopey', say: '…and 11’s digits add to 2. Now 23.', add: { t: '2 + 3', v: 5 } },
    { who: 'scopey', say: 'Multiply those: 2 times 5, and add the digits again — 1.', add: { t: '2 × 5', v: 10 } },
    { who: 'scopey', say: 'Your answer, 1081: its digits add to 10, which is 1 again. They match.', add: { t: '1 + 0 + 8 + 1', v: 10 } },
    { who: 'comet', say: 'So I’m right?', add: { t: '47 × 23', v: 1081 } },
    { who: 'scopey', say: 'Almost certainly. The nines check catches most slips — but not two digits swapped.' },
  ] },
  'divisible-3': { title: 'Three boats', scene: 'harbour', cast: ['panda', 'beaker'], beats: [
    { who: null, say: 'The day’s catch is 7,851 fish, to be shared equally between 3 boats.' },
    { who: 'beaker', say: 'Will it share exactly, or will there be fish left over?' },
    { who: 'panda', say: 'Add up the digits.', add: { t: '7 + 8 + 5 + 1', v: 21 } },
    { who: 'panda', say: '21 is in the three times table. So 7,851 is too.', add: { t: '21 ÷ 3', v: 7 } },
    { who: 'beaker', say: 'Then each boat gets exactly…', add: { t: '7851 ÷ 3', v: 2617 } },
    { who: 'panda', say: 'Not one fish left over.' },
  ] },
  'percent-swap': { title: 'The kite sale', scene: 'shop', cast: ['melody', 'comet'], beats: [
    { who: null, say: 'A sign in the shop: 8% off. The kite Dax wants costs 50 coins.', add: { t: '8% of 50' } },
    { who: 'comet', say: 'Eight percent of fifty? No idea.' },
    { who: 'melody', say: 'Swap them round. 8% of 50 is exactly the same as 50% of 8.' },
    { who: 'comet', say: 'Fifty percent is half. Half of 8…', add: { t: '50% of 8', v: 4 } },
    { who: 'melody', say: 'So 4 coins off.', add: { t: '8% of 50', v: 4 } },
  ] },
  'diff-squares': { title: 'The dare', scene: 'harbour', cast: ['goldlegend', 'pixel'], beats: [
    { who: null, say: 'Pip dares Vesper: 48 times 52, no paper.', add: { t: '48 × 52' } },
    { who: 'goldlegend', say: 'They are both 2 away from 50. Square the middle.', add: { t: '50 × 50', v: 2500 } },
    { who: 'goldlegend', say: 'Square the distance.', add: { t: '2 × 2', v: 4 } },
    { who: 'goldlegend', say: 'Take one from the other.', add: { t: '2500 − 4', v: 2496 } },
    { who: 'pixel', say: 'How?!', add: { t: '48 × 52', v: 2496 } },
    { who: 'goldlegend', say: 'Middle squared, minus distance squared. Every time.' },
  ] },
  'square-up': { title: 'One size bigger', scene: 'room', cast: ['astro', 'koi'], beats: [
    { who: null, say: 'Mira has laid a square of tiles 30 by 30. Now she wants it 31 by 31.', add: { t: '30 × 30', v: 900 } },
    { who: 'koi', say: 'Do you have to start all over?' },
    { who: 'astro', say: 'No. Add a row of 30 along one side and a column of 31 along the other.', add: { t: '30 + 31', v: 61 } },
    { who: 'koi', say: 'So the new square has…', add: { t: '900 + 61', v: 961 } },
    { who: 'astro', say: 'Nine hundred and sixty-one tiles.', add: { t: '31 × 31', v: 961 } },
  ] },
};

import { CHAPTERS } from './tricks.js';
export const STORIES = Object.assign({}, CORE_STORIES, ...CHAPTERS.map((c) => c.STORIES || {}));
export const SCENES = ['garden', 'festival', 'bus', 'library', 'cricket', 'market', 'hall', 'train', 'kitchen', 'fair', 'pond', 'night', 'stadium', 'harbour', 'shop', 'room',
  'bakery', 'clock', 'city', 'forest', 'palace', 'carnival', 'beach'];

/* Evaluate a notepad sum as plain arithmetic — the test's route, and the one
   the view never needs (it prints `v`, which the test proved). */
export function evalSum(t) {
  const js = String(t)
    .replace(/(\d+(?:\.\d+)?)% of (\d+(?:\.\d+)?)/g, '($1*$2/100)')
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '');
  if (!/^[\d\s+\-*/().]+$/.test(js)) throw new Error('not a sum: ' + t);
  return Function(`return (${js})`)();
}
