/* dictionary.js — the Maths Dictionary (docs/LIBRARY-CONTRACT.md).

   Every word a child meets between 6 and 14, said plainly: what it means (a
   definition that never leans on the word itself), an example with real
   numbers, a small picture for the words that are pictures, the words next to
   it, and the Atlas stops that teach it. Search as you type, prefix matches
   first; A–Z and topics to browse; a word of the day that is the same word in
   every house on the same date. */
import { icon } from '../icons.js';
import * as kit from '../chapters/kit.js';
import { TRICKS } from '../tricks.js';
import { seeded, dayKey } from '../rand.js';
import { META } from './shelf.js';

export const TOOL = META.dictionary;   // name, blurb and art live on the shelf (shelf.js), which loads without the tool

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const TOPICS = {
  number: 'Number', calc: 'Calculating', fractions: 'Fractions & decimals', ratio: 'Ratio & per cent', algebra: 'Algebra',
  sets: 'Sets', shape: 'Shape & space', measure: 'Measures', data: 'Data', chance: 'Chance', contest: 'Contest & Vedic',
};

/* [word, part of speech, topic, definition, example, see also, Atlas stops, extra] */
const RAW = [
  /* ------------------------------------------------------------ number */
  ['digit', 'noun', 'number', 'One of the ten symbols 0, 1, 2, 3, 4, 5, 6, 7, 8 and 9 that every number is written with.', '572 is written with three of them: 5, 7 and 2.', ['place value'], ['place-value']],
  ['place value', 'noun', 'number', 'What a digit is worth because of the column it sits in.', 'In 4,382 the 3 is worth 300; in 4,832 it is worth 30.', ['digit'], ['place-value']],
  ['million', 'noun', 'number', 'A thousand thousands: 1,000,000.', '2,500,000 is two and a half of them.', ['place value'], ['compare-big']],
  ['whole number', 'noun', 'number', 'One of 0, 1, 2, 3 and so on, with no fraction or decimal part.', '14 is one; 14.5 is not.', ['integer', 'decimal'], ['place-value']],
  ['integer', 'noun', 'number', 'A whole number, or a whole number below zero: …, −2, −1, 0, 1, 2, …', '−6, 0 and 25 all are; 2.5 is not.', ['whole number', 'negative number'], ['negative-numbers']],
  ['negative number', 'noun', 'number', 'A value below zero, written with a minus sign in front.', 'It is 3 °C and gets 5 degrees colder: now it is −2 °C.', ['integer', 'zero'], ['negative-numbers']],
  ['zero', 'noun', 'number', 'Nothing at all — and the digit 0 that keeps a column empty so the other digits stay in their places.', 'In 405 the 0 shows there are no tens.', ['place value', 'negative number'], ['place-value', 'negative-numbers']],
  ['even', 'adjective', 'number', 'Able to be split into two equal whole groups; the last digit is 0, 2, 4, 6 or 8.', '36 = 18 + 18.', ['odd', 'multiple'], ['divisible-2-5-10']],
  ['odd', 'adjective', 'number', 'Leaving one over when split into twos; the last digit is 1, 3, 5, 7 or 9.', '37 = 18 + 18 + 1.', ['even'], ['divisible-2-5-10', 'odd-staircase']],
  ['factor', 'noun', 'number', 'A whole number that divides into another exactly, leaving nothing over.', '12 can be divided exactly by 1, 2, 3, 4, 6 and 12.', ['factor pair', 'multiple', 'prime number'], ['factor-pairs']],
  ['factor pair', 'noun', 'number', 'Two whole numbers that multiply together to make a given number.', '3 and 8 are one for 24, because 3 × 8 = 24.', ['factor'], ['factor-pairs']],
  ['multiple', 'noun', 'number', 'What you get when a number is multiplied by 1, 2, 3, 4 and so on — its times table, carried on for ever.', '6, 12, 18 and 24 are the first four for 6.', ['factor', 'lowest common multiple', 'times table'], ['multiples']],
  ['prime number', 'noun', 'number', 'A whole number greater than 1 that only 1 and itself divide exactly.', '13: only 1 × 13 makes it.', ['composite number', 'factor', 'prime factorisation'], ['prime-or-not'], { alias: ['prime'] }],
  ['composite number', 'noun', 'number', 'A whole number with more than two factors, so it can be made by multiplying smaller whole numbers.', '15 = 3 × 5.', ['prime number'], ['prime-or-not']],
  ['prime factorisation', 'noun', 'number', 'Writing a number as a multiplication of primes only.', '60 = 2 × 2 × 3 × 5.', ['factor tree', 'prime number', 'index'], ['factor-tree']],
  ['factor tree', 'noun', 'number', 'A branching drawing that splits a number into two factors, again and again, until every branch ends in a prime.', '60 → 6 × 10 → 2 × 3 × 2 × 5.', ['prime factorisation'], ['factor-tree']],
  ['highest common factor', 'noun', 'number', 'The biggest whole number that divides exactly into two or more numbers. Short name: HCF.', 'For 12 and 18 it is 6.', ['factor', 'lowest common multiple'], ['hcf'], { alias: ['hcf', 'gcd', 'greatest common divisor'] }],
  ['lowest common multiple', 'noun', 'number', 'The smallest number that two or more numbers all divide into exactly. Short name: LCM.', 'For 4 and 6 it is 12.', ['multiple', 'highest common factor'], ['lcm'], { alias: ['lcm'] }],
  ['square number', 'noun', 'number', 'What you get when a whole number is multiplied by itself — that many dots make a perfect square.', '49 = 7 × 7.', ['squared', 'square root', 'cube number'], ['square-dots', 'teen-squares']],
  ['squared', 'adjective', 'number', 'Multiplied by itself, and written with a small raised 2.', '5² = 5 × 5 = 25.', ['square number', 'index'], ['square-dots', 'powers-index']],
  ['square root', 'noun', 'number', 'The number which, multiplied by itself, gives the one you started with. Sign: √.', '√81 = 9, because 9 × 9 = 81.', ['square number', 'cube root'], ['root-of-square']],
  ['cube number', 'noun', 'number', 'A whole number multiplied by itself and then by itself again — that many small blocks build one big block with equal edges.', '64 = 4 × 4 × 4.', ['cube root', 'square number'], ['cube-and-root']],
  ['cube root', 'noun', 'number', 'The number which, used three times in a multiplication, gives the one you started with. Sign: ∛.', '∛125 = 5, because 5 × 5 × 5 = 125.', ['cube number', 'square root'], ['cube-and-root']],
  ['index', 'noun', 'number', 'The small raised number that says how many times the base is multiplied by itself. Plural: indices.', 'In 2⁵ it is the 5: 2 × 2 × 2 × 2 × 2 = 32.', ['power', 'base', 'index laws'], ['powers-index'], { alias: ['indices', 'exponent'] }],
  ['power', 'noun', 'number', 'A number multiplied by itself a given number of times, like 3⁴.', '3⁴ = 3 × 3 × 3 × 3 = 81.', ['index', 'base', 'squared'], ['powers-index']],
  ['base', 'noun', 'number', 'The number being multiplied in a power (the 2 in 2⁵) — or the side a shape stands on.', 'In 10³ it is the 10; in a triangle it is the bottom side.', ['index', 'power', 'perpendicular height'], ['powers-index', 'area-triangles']],
  ['index laws', 'noun', 'number', 'Rules for powers of the same number: add the little raised numbers when you multiply, take them away when you divide.', '2³ × 2⁴ = 2⁷ = 128.', ['index', 'power'], ['index-laws']],
  ['standard form', 'noun', 'number', 'A way to write very big or very small numbers as a number from 1 up to (not including) 10, times a power of ten.', '32,000 = 3.2 × 10⁴.', ['power', 'place value'], ['times-ten-decimals']],
  ['divisible', 'adjective', 'number', 'Able to be divided exactly, with nothing left over.', '42 ÷ 7 = 6 exactly, so 42 is — by 7.', ['factor', 'divisibility test', 'remainder'], ['divisible-2-5-10']],
  ['divisibility test', 'noun', 'number', 'A quick check that tells you whether one number goes exactly into another without doing the sum.', 'Digits adding to a multiple of 3 means 3 goes in: 123 → 1 + 2 + 3 = 6, so yes.', ['divisible', 'digit root'], ['divisible-2-5-10', 'divisible-4-8', 'divisible-6-11', 'divisible-3']],
  ['rounding', 'noun', 'number', 'Swapping a number for a nearby, simpler one — to the nearest 10, 100 or whole one.', '347 to the nearest 10 is 350.', ['estimate', 'decimal place'], ['round-nearest', 'round-decimals'], { alias: ['round'] }],
  ['estimate', 'verb', 'number', 'Make a sensible guess, often with easier numbers, to see roughly what an answer should be.', '49 × 21 is about 50 × 20 = 1,000.', ['rounding'], ['round-nearest', 'round-add']],
  ['greater than', 'phrase', 'number', 'Bigger than. The sign > opens its wide mouth towards the bigger number.', '9 > 4.', ['less than', 'inequality'], ['compare-big']],
  ['less than', 'phrase', 'number', 'Smaller than. The sign < points its narrow end at the smaller number.', '4 < 9.', ['greater than', 'inequality'], ['compare-big']],
  ['Roman numerals', 'noun', 'number', 'Numbers written with the letters I, V, X, L, C, D and M, added or taken away depending on where they sit.', 'XIV = 10 + 4 = 14.', ['digit', 'place value'], ['roman-numerals']],
  ['number line', 'noun', 'number', 'A straight line with values marked in order at equal steps, for counting on, back and in between.', '−2 sits two steps to the left of 0.', ['negative number', 'integer'], ['count-up', 'negative-numbers']],
  ['factorial', 'noun', 'number', 'A whole number multiplied by every whole number below it, down to 1 — the number of orders that many different things can go in. Sign: !.', '5! = 5 × 4 × 3 × 2 × 1 = 120, and 0! = 1.', ['product', 'arrangement', 'permutation'], ['factorials', 'arrange-all']],
  ['triangular number', 'noun', 'number', 'A count of dots that can be laid out as a triangle: 1, 3, 6, 10, 15, …', '10 dots make rows of 1, 2, 3 and 4.', ['square number', 'sequence'], []],

  /* ------------------------------------------------------------ calculating */
  ['addition', 'noun', 'calc', 'Putting amounts together to find how many there are altogether. Sign: +.', '8 + 5 = 13.', ['sum', 'subtraction'], ['make-ten', 'column-add'], { alias: ['add', 'plus'] }],
  ['sum', 'noun', 'calc', 'The answer when numbers are added together. People also use it for any calculation.', 'For 8 and 5 it is 13.', ['addition'], ['make-ten', 'tens-then-ones']],
  ['subtraction', 'noun', 'calc', 'Taking one amount away from another, or finding the gap between them. Sign: −.', '13 − 8 = 5.', ['difference', 'addition'], ['count-up', 'column-sub'], { alias: ['take away', 'minus', 'subtract'] }],
  ['difference', 'noun', 'calc', 'How far apart two numbers are: the bigger one take away the smaller one.', 'Between 13 and 8 it is 5.', ['subtraction'], ['count-up', 'bar-compare']],
  ['multiplication', 'noun', 'calc', 'Adding equal groups in one go. Sign: ×.', '4 × 3 means four groups of three: 12.', ['product', 'times table', 'division'], ['double-double', 'long-multiply'], { alias: ['times', 'multiply'] }],
  ['product', 'noun', 'calc', 'The answer when numbers are multiplied together.', 'For 6 and 7 it is 42.', ['multiplication', 'factor'], ['long-multiply']],
  ['division', 'noun', 'calc', 'Sharing into equal groups, or finding how many equal groups fit. Sign: ÷.', '12 ÷ 3 = 4.', ['quotient', 'remainder', 'multiplication'], ['short-division'], { alias: ['divide', 'share'] }],
  ['quotient', 'noun', 'calc', 'The answer to a division.', 'In 20 ÷ 4 = 5 it is 5.', ['division', 'remainder'], ['short-division']],
  ['remainder', 'noun', 'calc', 'What is left over when one number does not go exactly into another.', '17 ÷ 5 = 3, with 2 left over.', ['division', 'divisible'], ['short-division']],
  ['inverse operation', 'noun', 'calc', 'The operation that undoes another: take away undoes add, and divide undoes multiply.', '7 × 6 = 42, so 42 ÷ 6 = 7.', ['working backwards', 'function machine'], ['think-of-a-number', 'count-up']],
  ['commutative', 'adjective', 'calc', 'Giving the same answer in either order — true of adding and multiplying, not of taking away or dividing.', '3 + 5 = 5 + 3 and 4 × 7 = 7 × 4.', ['associative', 'distributive'], ['near-doubles', 'double-double']],
  ['associative', 'adjective', 'calc', 'Giving the same answer however the numbers are grouped with brackets — true of adding and multiplying.', '(2 + 3) + 4 = 2 + (3 + 4).', ['commutative', 'brackets'], ['halve-double']],
  ['distributive', 'adjective', 'calc', 'Multiplying a whole bracket gives the same as multiplying each part inside it and adding.', '6 × 14 = 6 × 10 + 6 × 4 = 84.', ['partitioning', 'expand'], ['split-multiply', 'times-twelve']],
  ['order of operations', 'noun', 'calc', 'The agreed order for working out a calculation: brackets, then powers, then × and ÷, then + and −.', '2 + 3 × 4 = 14, not 20.', ['BIDMAS', 'brackets'], ['order-of-operations']],
  ['BIDMAS', 'noun', 'calc', 'A memory word for what goes first: Brackets, Indices, Division and Multiplication, Addition and Subtraction.', '(2 + 3)² − 4 = 25 − 4 = 21.', ['order of operations', 'brackets', 'index'], ['order-of-operations'], { alias: ['bodmas', 'pemdas'] }],
  ['brackets', 'noun', 'calc', 'The marks ( ) that mean “work this part out first”.', '(2 + 3) × 4 = 20.', ['order of operations', 'expand'], ['order-of-operations'], { alias: ['parentheses'] }],
  ['column method', 'noun', 'calc', 'Writing numbers one under another, lined up by place value, and working one digit at a time.', '347 + 285: ones 12, tens 13, hundreds 6 → 632.', ['exchange', 'place value'], ['column-add', 'column-sub']],
  ['exchange', 'verb', 'calc', 'Swap one from the next column on the left for ten in this one, so you can take away. Some people say “borrow”.', 'In 52 − 17 one ten becomes ten ones: 12 − 7 = 5.', ['column method'], ['column-sub'], { alias: ['borrow'] }],
  ['long multiplication', 'noun', 'calc', 'A written method: multiply by each digit of the second number in turn, then add the rows.', '23 × 14 = 23 × 4 + 23 × 10 = 92 + 230 = 322.', ['multiplication', 'partitioning'], ['long-multiply']],
  ['short division', 'noun', 'calc', 'A written method that shares one digit at a time, passing each remainder on to the next digit.', '96 ÷ 4: 9 ÷ 4 = 2 r 1, then 16 ÷ 4 = 4 → 24.', ['division', 'remainder'], ['short-division']],
  ['times table', 'noun', 'calc', 'The list of a number multiplied by 1, 2, 3 and so on, usually up to 12.', 'The 7s: 7, 14, 21, 28, 35, …', ['multiple', 'multiplication'], ['double-double', 'times-nine']],
  ['double', 'verb', 'calc', 'Multiply by 2, or add a number to itself.', '7 → 14.', ['halve'], ['near-doubles', 'double-double']],
  ['halve', 'verb', 'calc', 'Divide by 2, or split into two equal parts.', '14 → 7.', ['double', 'half'], ['times-five', 'halve-double']],
  ['number bond', 'noun', 'calc', 'Two numbers that add to make a given total, often 10 or 100.', '7 and 3 make 10; 65 and 35 make 100.', ['addition'], ['make-ten']],
  ['compensation', 'noun', 'calc', 'Rounding a number to make a calculation easy, then fixing the answer by the amount you changed.', '47 + 29 = 47 + 30 − 1 = 76.', ['rounding', 'estimate'], ['round-add', 'round-sub', 'plus-nine']],
  ['partitioning', 'noun', 'calc', 'Splitting a number into parts that are easier to work with, like tens and ones.', '47 = 40 + 7.', ['place value', 'distributive'], ['tens-then-ones', 'split-multiply']],
  ['mental maths', 'noun', 'calc', 'Working things out in your head, often with a shortcut, instead of on paper.', '25 × 16 = 100 × 4 = 400.', ['estimate', 'partitioning', 'Vedic maths'], ['times-25', 'halve-double']],

  /* ------------------------------------------------------------ fractions & decimals */
  ['fraction', 'noun', 'fractions', 'A part of a whole, written as one number over another, like 3/4.', '3/4 of a pizza is 3 of its 4 equal slices.', ['numerator', 'denominator', 'decimal'], ['fraction-parts']],
  ['numerator', 'noun', 'fractions', 'The top number of a fraction: how many of the equal parts you have.', 'In 3/4 it is 3.', ['denominator', 'fraction'], ['fraction-parts']],
  ['denominator', 'noun', 'fractions', 'The bottom number of a fraction: how many equal parts the whole is cut into.', 'In 3/4 it is 4.', ['numerator', 'common denominator'], ['fraction-parts']],
  ['unit fraction', 'noun', 'fractions', 'A fraction with 1 on top, like 1/2, 1/3 or 1/5.', '1/5 of 20 = 4.', ['fraction', 'numerator'], ['fraction-parts', 'fraction-of-amount']],
  ['half', 'noun', 'fractions', 'One of two equal parts: 1/2 or 0.5.', 'One of these of 18 is 9.', ['quarter', 'halve'], ['fraction-parts']],
  ['quarter', 'noun', 'fractions', 'One of four equal parts: 1/4 or 0.25.', 'One of these of 20 is 5.', ['half'], ['fraction-parts']],
  ['equivalent fractions', 'noun', 'fractions', 'Fractions that look different but stand for the same amount.', '1/2 = 2/4 = 3/6.', ['simplest form', 'fraction'], ['equivalent-fractions']],
  ['simplify', 'verb', 'fractions', 'Divide the top and bottom of a fraction by the same number, so it is written with smaller numbers.', '6/8 → 3/4, dividing both by 2.', ['simplest form', 'highest common factor'], ['simplify-fractions']],
  ['simplest form', 'noun', 'fractions', 'A fraction whose top and bottom share no factor except 1.', '3/4 is; 6/8 is not.', ['simplify', 'equivalent fractions'], ['simplify-fractions'], { alias: ['lowest terms'] }],
  ['improper fraction', 'noun', 'fractions', 'A fraction whose top number is bigger than its bottom number — worth more than one whole. Also called top-heavy.', '7/4 = 1 3/4.', ['mixed number'], ['mixed-numbers'], { alias: ['top-heavy'] }],
  ['mixed number', 'noun', 'fractions', 'A whole number and a fraction written together.', '2 1/2 means 2 wholes and a half.', ['improper fraction'], ['mixed-numbers']],
  ['common denominator', 'noun', 'fractions', 'A bottom number that two fractions can both be rewritten over, so they can be added or compared.', '1/3 + 1/4 = 4/12 + 3/12 = 7/12.', ['lowest common multiple', 'equivalent fractions'], ['add-different-bottoms', 'compare-fractions']],
  ['reciprocal', 'noun', 'fractions', '1 divided by a number — for a fraction, the fraction turned upside down.', 'For 3/4 it is 4/3, and 3/4 × 4/3 = 1.', ['fraction', 'division'], ['divide-fractions']],
  ['decimal', 'noun', 'fractions', 'A number written with a point, where the digits after the point are tenths, hundredths and so on.', '3.25 = 3 + 2 tenths + 5 hundredths.', ['decimal point', 'tenth', 'fraction'], ['decimal-places']],
  ['decimal point', 'noun', 'fractions', 'The dot that separates the whole-number part from the tenths.', 'In 12.5 it sits between the 2 and the 5.', ['decimal', 'place value'], ['decimal-places', 'add-decimals']],
  ['decimal place', 'noun', 'fractions', 'One position after the point: the first is tenths, the second hundredths, the third thousandths.', '3.142 has three.', ['decimal', 'rounding'], ['decimal-places', 'round-decimals']],
  ['tenth', 'noun', 'fractions', 'One of ten equal parts: 1/10 or 0.1.', 'Three of them make 0.3.', ['hundredth', 'decimal'], ['decimal-places']],
  ['hundredth', 'noun', 'fractions', 'One of a hundred equal parts: 1/100 or 0.01.', '1p is 0.01 of £1.', ['tenth', 'per cent'], ['decimal-places']],
  ['recurring decimal', 'noun', 'fractions', 'A decimal whose digits repeat for ever.', '1/3 = 0.333…', ['decimal', 'fraction'], ['fraction-decimal-percent']],

  /* ------------------------------------------------------------ ratio & per cent */
  ['per cent', 'noun', 'ratio', 'Out of every hundred. Sign: %.', '25% means 25 out of every 100 — the same as 1/4.', ['percentage', 'fraction'], ['fraction-decimal-percent'], { alias: ['percent', '%'] }],
  ['percentage', 'noun', 'ratio', 'An amount written as a number out of 100.', '17 children out of 100 is 17%.', ['per cent', 'percentage change'], ['percent-of-amount']],
  ['percentage change', 'noun', 'ratio', 'How much something went up or down, as a part of what it started at, times 100.', 'From 50 to 60: a rise of 10, and 10 ÷ 50 × 100 = 20%.', ['percentage', 'discount'], ['percent-change']],
  ['discount', 'noun', 'ratio', 'An amount taken off a price.', '20% off £40 saves £8, so you pay £32.', ['percentage change', 'profit'], ['percent-change']],
  ['profit', 'noun', 'ratio', 'The money you make when you sell something for more than it cost you.', 'Buy for £6, sell for £10: £4.', ['discount', 'percentage'], ['multi-step-problems']],
  ['interest', 'noun', 'ratio', 'Extra money paid for borrowing, or earned for saving — usually a percentage each year.', '5% a year on £200 is £10 a year.', ['simple interest', 'percentage'], ['percent-of-amount']],
  ['simple interest', 'noun', 'ratio', 'Extra money on savings or a loan worked out on the starting amount only, so the same amount is added every year.', '£200 at 5% for 3 years: 3 × £10 = £30.', ['interest'], ['percent-of-amount']],
  ['ratio', 'noun', 'ratio', 'A way of comparing amounts, written with a colon, like 2 : 3.', 'Red to blue 2 : 3 means 2 red for every 3 blue.', ['proportion', 'share in a ratio'], ['ratio-share']],
  ['share in a ratio', 'phrase', 'ratio', 'Split an amount into unequal parts: add the parts of the ratio, find what one part is worth, then multiply.', '£20 in 2 : 3 → 5 parts of £4 → £8 and £12.', ['ratio', 'unitary method'], ['ratio-share']],
  ['proportion', 'noun', 'ratio', 'A part compared with the whole — or two amounts that grow and shrink together at the same rate.', '3 sweets out of 12 is a quarter.', ['ratio', 'direct proportion'], ['unitary-method', 'ratio-share']],
  ['direct proportion', 'noun', 'ratio', 'When one amount doubles, the other doubles too; when one halves, so does the other.', '3 pens cost £6, so 6 pens cost £12.', ['unitary method', 'proportion'], ['unitary-method']],
  ['unitary method', 'noun', 'ratio', 'Find the value of one first, then multiply up to the amount you need.', '4 cakes cost £8 → 1 costs £2 → 7 cost £14.', ['direct proportion'], ['unitary-method']],
  ['rate', 'noun', 'ratio', 'How much of one thing there is for each one of another.', '60 km per hour; £8 per kilogram.', ['speed', 'compound measure'], ['speed-distance-time', 'unitary-method']],

  /* ------------------------------------------------------------ algebra */
  ['algebra', 'noun', 'algebra', 'Maths that uses letters to stand for numbers, so one rule can cover every case.', '2 + 9 = 9 + 2, and a + b = b + a for every a and b.', ['variable', 'expression', 'equation'], ['substitute']],
  ['variable', 'noun', 'algebra', 'A letter that stands for a number which can change.', 'In y = 2x + 1, x and y can both take many values.', ['unknown', 'algebra'], ['substitute', 'line-graph']],
  ['unknown', 'noun', 'algebra', 'A letter standing for one number you are trying to find.', 'In x + 4 = 11, x is 7.', ['equation', 'solve'], ['solve-balance']],
  ['expression', 'noun', 'algebra', 'Numbers and letters joined by operations, with no equals sign.', '3x + 2 (while 3x + 2 = 11 is an equation).', ['equation', 'term', 'like terms'], ['like-terms', 'substitute']],
  ['equation', 'noun', 'algebra', 'A statement that two things are equal, with an = sign between them.', '2x + 1 = 9.', ['expression', 'solve', 'identity'], ['solve-balance']],
  ['formula', 'noun', 'algebra', 'A rule written with letters that links quantities together.', 'A = l × w: a 5 by 3 rectangle has A = 15.', ['substitute', 'expression'], ['substitute', 'area-rectangles'], { alias: ['formulae', 'formulas'] }],
  ['substitute', 'verb', 'algebra', 'Put a number in place of a letter.', 'If a = 3, then 4a + 1 = 4 × 3 + 1 = 13.', ['formula', 'variable'], ['substitute']],
  ['term', 'noun', 'algebra', 'One number in a sequence, or one part of an expression between the + and − signs.', '3x + 5y − 2 has three.', ['like terms', 'nth term', 'sequence'], ['like-terms', 'nth-term']],
  ['like terms', 'noun', 'algebra', 'Parts of an expression with exactly the same letters, which can be added together.', '3a + 5a = 8a, but 3a + 5b stays as it is.', ['term', 'coefficient'], ['like-terms']],
  ['coefficient', 'noun', 'algebra', 'The number in front of a letter, which multiplies it.', 'In 4x it is 4.', ['term'], ['like-terms']],
  ['solve', 'verb', 'algebra', 'Find the value that makes an equation true.', '2x + 1 = 9 → 2x = 8 → x = 4.', ['equation', 'unknown', 'inverse operation'], ['solve-balance']],
  ['expand', 'verb', 'algebra', 'Multiply out brackets.', '3(x + 2) = 3x + 6.', ['factorise', 'brackets', 'distributive'], ['split-multiply']],
  ['factorise', 'verb', 'algebra', 'Put an expression back into brackets by taking out a factor that every part shares.', '6x + 9 = 3(2x + 3).', ['expand', 'highest common factor'], ['hcf']],
  ['identity', 'noun', 'algebra', 'A statement with an = sign that is true for every value of its letters.', '(a + b)² = a² + 2ab + b², whatever a and b are.', ['equation', 'difference of two squares'], ['square-up', 'diff-squares']],
  ['difference of two squares', 'noun', 'algebra', 'One square number taken from another — which always equals (a + b)(a − b).', '52² − 48² = 100 × 4 = 400.', ['identity', 'square number'], ['diff-squares']],
  ['sequence', 'noun', 'algebra', 'A list of numbers that follows a rule.', '3, 7, 11, 15, … goes up in 4s.', ['term', 'nth term', 'term-to-term rule'], ['nth-term']],
  ['term-to-term rule', 'noun', 'algebra', 'How to get from each number in a sequence to the next one.', '“Add 4” takes 3, 7, 11 on to 15.', ['sequence', 'nth term'], ['nth-term', 'multiples']],
  ['nth term', 'noun', 'algebra', 'A rule that gives any number in a sequence straight from its position, n.', '4n − 1 gives 3, 7, 11, 15, …; the 10th is 39.', ['sequence', 'term-to-term rule'], ['nth-term']],
  ['Fibonacci sequence', 'noun', 'algebra', 'A list where each number is the two before it added together.', '1, 1, 2, 3, 5, 8, 13, 21, …', ['sequence', 'term'], []],
  ['linear', 'adjective', 'algebra', 'Making a straight line when you draw it, with no letter squared or higher.', 'y = 2x + 1.', ['gradient', 'intercept'], ['line-graph']],
  ['gradient', 'noun', 'algebra', 'How steep a line is: how far it rises for each one step across.', 'y = 3x + 1 rises 3 for every 1 across.', ['intercept', 'linear'], ['line-graph'], { alias: ['slope'] }],
  ['intercept', 'noun', 'algebra', 'Where a line crosses the y-axis — the one that runs up and down.', 'y = 2x + 5 crosses it at (0, 5).', ['gradient', 'axis'], ['line-graph']],
  ['function machine', 'noun', 'algebra', 'A box that takes a number in, does something to it, and sends the result out.', 'In 5 → × 2 → + 3 → out 13.', ['inverse operation', 'working backwards'], ['think-of-a-number']],
  ['working backwards', 'noun', 'algebra', 'Undoing each step in reverse order to find what you started with.', 'Out 13, rule “× 2 then + 3”: 13 − 3 = 10, 10 ÷ 2 = 5.', ['inverse operation', 'function machine'], ['think-of-a-number']],
  ['inequality', 'noun', 'algebra', 'A statement that one side is bigger or smaller than the other, using <, >, ≤ or ≥.', 'x + 2 > 5 is true for any x greater than 3.', ['greater than', 'less than', 'equation'], ['compare-big']],

  /* ------------------------------------------------------------ sets */
  ['set', 'noun', 'sets', 'A collection of things, each listed once, written inside curly brackets.', '{2, 4, 6, 8} — the even numbers below 10.', ['element', 'subset', 'empty set'], ['set-member']],
  ['element', 'noun', 'sets', 'One of the things inside a set. The sign ∈ means “is in”.', '3 ∈ {1, 2, 3}.', ['set'], ['set-member'], { alias: ['member'] }],
  ['empty set', 'noun', 'sets', 'A set with nothing in it, written { } or ∅.', 'Even numbers that are also odd: { }, with 0 things in it.', ['set', 'subset'], ['set-count']],
  ['subset', 'noun', 'sets', 'A set made only from things that are in another set.', '{1, 2} is one of {1, 2, 3}.', ['set', 'union'], ['subset-count']],
  ['union', 'noun', 'sets', 'Everything that is in either set, or in both. Sign: ∪.', '{1, 2} ∪ {2, 3} = {1, 2, 3}.', ['intersection', 'Venn diagram'], ['union-meet']],
  ['intersection', 'noun', 'sets', 'Only the things that are in both sets at once. Sign: ∩.', '{1, 2} ∩ {2, 3} = {2}.', ['union', 'Venn diagram'], ['union-meet']],
  ['Venn diagram', 'noun', 'sets', 'Overlapping circles that sort things into groups; the overlap holds what belongs to both.', '5 have only a cat, 4 only a dog, 3 have both.', ['union', 'intersection', 'universal set'], ['venn-count']],
  ['universal set', 'noun', 'sets', 'Everything being talked about — the box drawn round a Venn diagram.', 'Sorting 1 to 10, it is {1, 2, …, 10}.', ['Venn diagram'], ['venn-count']],

  /* ------------------------------------------------------------ shape & space */
  ['polygon', 'noun', 'shape', 'A flat, closed shape made only of straight sides.', 'A triangle (3 sides) or a hexagon (6 sides).', ['regular', 'vertex'], ['sides-and-corners']],
  ['vertex', 'noun', 'shape', 'A corner, where sides or edges meet. Plural: vertices.', 'A cube has 8.', ['edge', 'face'], ['faces-edges-vertices', 'sides-and-corners'], { alias: ['vertices', 'corner'] }],
  ['edge', 'noun', 'shape', 'A line where two faces of a solid meet.', 'A cube has 12.', ['face', 'vertex'], ['faces-edges-vertices']],
  ['face', 'noun', 'shape', 'A flat surface of a solid.', 'A cube has 6, all squares.', ['edge', 'vertex', 'net'], ['faces-edges-vertices']],
  ['triangle', 'noun', 'shape', 'A flat shape with three straight sides and three corners.', 'Its angles always add to 180°.', ['equilateral triangle', 'isosceles triangle', 'scalene triangle'], ['kinds-of-triangle']],
  ['equilateral triangle', 'noun', 'shape', 'A three-sided shape with all its sides the same length and every angle 60°.', 'Sides 5 cm, 5 cm and 5 cm.', ['isosceles triangle', 'regular'], ['kinds-of-triangle']],
  ['isosceles triangle', 'noun', 'shape', 'A three-sided shape with two sides the same length — and the two angles at their foot equal.', 'Sides 5 cm, 5 cm and 3 cm.', ['equilateral triangle', 'scalene triangle'], ['kinds-of-triangle']],
  ['scalene triangle', 'noun', 'shape', 'A three-sided shape with every side a different length.', 'Sides 4 cm, 6 cm and 7 cm.', ['isosceles triangle', 'triangle'], ['kinds-of-triangle']],
  ['right-angled triangle', 'noun', 'shape', 'A three-sided shape with one angle of exactly 90°.', 'Sides 3, 4 and 5 make one.', ['right angle', 'hypotenuse', 'Pythagoras’ theorem'], ['kinds-of-triangle']],
  ['quadrilateral', 'noun', 'shape', 'A flat shape with four straight sides.', 'Its angles add up to 360°.', ['rectangle', 'parallelogram', 'trapezium'], ['four-sided-shapes']],
  ['square', 'noun', 'shape', 'A four-sided shape with all four sides equal and all four corners right angles.', 'One with 3 cm sides has perimeter 12 cm and area 9 cm².', ['rectangle', 'rhombus', 'square number'], ['four-sided-shapes']],
  ['rectangle', 'noun', 'shape', 'A four-sided shape with four right angles, and opposite sides equal.', '6 cm by 4 cm: area 24 cm².', ['square', 'area', 'perimeter'], ['four-sided-shapes', 'area-rectangles']],
  ['parallelogram', 'noun', 'shape', 'A four-sided shape whose opposite sides are parallel and equal.', 'Base 8 cm, height 3 cm: area 24 cm².', ['rhombus', 'parallel'], ['four-sided-shapes', 'area-triangles']],
  ['rhombus', 'noun', 'shape', 'A four-sided shape with all four sides equal — like a square pushed over.', 'All 4 sides 5 cm.', ['square', 'parallelogram', 'kite'], ['four-sided-shapes']],
  ['trapezium', 'noun', 'shape', 'A four-sided shape with exactly one pair of parallel sides.', 'Parallel sides 4 cm and 6 cm, height 3 cm: area 15 cm².', ['parallelogram', 'parallel'], ['four-sided-shapes']],
  ['kite', 'noun', 'shape', 'A four-sided shape with two pairs of equal sides that sit next to each other.', 'Sides 5, 5, 8 and 8 cm.', ['rhombus', 'diagonal'], ['four-sided-shapes']],
  ['pentagon', 'noun', 'shape', 'A flat shape with five straight sides.', 'Its inside angles add up to 540°.', ['hexagon', 'polygon'], ['sides-and-corners', 'angles-in-a-shape']],
  ['hexagon', 'noun', 'shape', 'A flat shape with six straight sides.', 'Six sides; its inside angles add to 720°.', ['pentagon', 'tessellation'], ['sides-and-corners']],
  ['regular', 'adjective', 'shape', 'Having every side the same length and every angle the same size.', 'A square: 4 equal sides, 4 angles of 90°.', ['polygon', 'equilateral triangle'], ['angles-in-a-shape']],
  ['diagonal', 'noun', 'shape', 'A straight line joining two corners of a shape that are not next to each other.', 'A rectangle has 2.', ['vertex', 'polygon'], ['four-sided-shapes']],
  ['circle', 'noun', 'shape', 'A round flat shape where every point on the edge is the same distance from the centre.', 'Radius 3 cm: area about 3.14 × 3 × 3 = 28.26 cm².', ['radius', 'diameter', 'circumference'], ['round-the-circle']],
  ['radius', 'noun', 'shape', 'The distance from the centre of a circle out to its edge. Plural: radii.', 'A circle 10 cm across has one of 5 cm.', ['diameter', 'circle'], ['round-the-circle']],
  ['diameter', 'noun', 'shape', 'The distance straight across a circle through its centre — two radii end to end.', 'Radius 4 cm → 8 cm across.', ['radius', 'circumference'], ['round-the-circle']],
  ['circumference', 'noun', 'shape', 'The distance all the way round a circle.', 'About 3.14 times the width: a 10 cm wheel is about 31.4 cm round.', ['diameter', 'pi', 'perimeter'], ['round-the-circle']],
  ['pi', 'noun', 'shape', 'The number you get by dividing any circle’s distance round by its distance across — about 3.14. Sign: π.', 'C = π × d: 10 cm across gives about 31.4 cm round.', ['circumference', 'diameter'], ['round-the-circle'], { alias: ['π'] }],
  ['sector', 'noun', 'shape', 'A slice of a circle between two radii, like a slice of pie.', 'A quarter-circle has a 90° angle at the centre.', ['pie chart'], ['round-the-circle']],
  ['parallel', 'adjective', 'shape', 'Always the same distance apart, so they never meet however far they go.', 'The 2 rails of a railway track.', ['perpendicular'], ['four-sided-shapes']],
  ['perpendicular', 'adjective', 'shape', 'Meeting or crossing at a right angle.', 'The 2 sides at the corner of a page meet at 90°.', ['parallel', 'right angle'], ['kinds-of-angle']],
  ['angle', 'noun', 'shape', 'The amount of turn between two lines that meet at a point, measured in degrees.', 'A quarter turn is 90°.', ['degree', 'right angle', 'acute angle'], ['kinds-of-angle']],
  ['degree', 'noun', 'shape', 'The unit for measuring turn; a full turn is 360 of them. Sign: °.', 'A right angle is 90°.', ['angle', 'protractor'], ['kinds-of-angle']],
  ['right angle', 'noun', 'shape', 'A quarter turn: exactly 90°.', 'The corner of a page: 90°.', ['perpendicular', 'acute angle', 'obtuse angle'], ['kinds-of-angle']],
  ['acute angle', 'noun', 'shape', 'A turn smaller than 90°.', '35°.', ['right angle', 'obtuse angle'], ['kinds-of-angle']],
  ['obtuse angle', 'noun', 'shape', 'A turn bigger than 90° but smaller than 180°.', '125°.', ['acute angle', 'reflex angle'], ['kinds-of-angle']],
  ['reflex angle', 'noun', 'shape', 'A turn bigger than 180° but smaller than 360°.', '250°.', ['obtuse angle', 'angles round a point'], ['kinds-of-angle']],
  ['angles on a line', 'noun', 'shape', 'Turns that sit side by side on one straight line; together they make 180°.', '70° and 110°.', ['angles round a point'], ['angles-on-a-line']],
  ['angles round a point', 'noun', 'shape', 'Turns that fill the whole way round one point; together they make 360°.', '90° + 120° + 150° = 360°.', ['angles on a line', 'reflex angle'], ['angles-on-a-line']],
  ['vertically opposite angles', 'noun', 'shape', 'The equal pair of turns facing each other across the point where two straight lines cross.', 'If one is 40°, the one across is 40° too.', ['angles on a line'], ['angles-on-a-line']],
  ['interior angle', 'noun', 'shape', 'A turn inside a shape, at one of its corners.', 'A regular hexagon has six of 120°.', ['exterior angle', 'polygon'], ['angles-in-a-shape']],
  ['exterior angle', 'noun', 'shape', 'The turn you make at a corner as you walk round the outside of a shape.', 'Regular hexagon: 360° ÷ 6 = 60° at each corner.', ['interior angle', 'regular'], ['angles-in-a-shape']],
  ['protractor', 'noun', 'shape', 'A see-through half-circle marked in degrees, for measuring and drawing turns.', 'Line the centre up with the corner, read 0 along one arm.', ['degree', 'angle'], ['kinds-of-angle']],
  ['clockwise', 'adverb', 'shape', 'Turning the same way as the hands of a clock.', 'A quarter turn this way takes 12 round to 3.', ['rotation'], ['coordinates-and-moves']],
  ['line of symmetry', 'noun', 'shape', 'A fold line that splits a shape into two halves that match exactly, like a mirror.', 'A square has 4.', ['reflection', 'rotational symmetry'], ['lines-of-symmetry'], { alias: ['mirror line', 'symmetry'] }],
  ['rotational symmetry', 'noun', 'shape', 'When a shape fits onto itself more than once as it turns a full circle.', 'A square does it 4 times: order 4.', ['line of symmetry', 'rotation'], ['lines-of-symmetry']],
  ['reflection', 'noun', 'shape', 'Flipping a shape over a mirror line.', 'Over the y-axis, (3, 2) lands on (−3, 2).', ['line of symmetry', 'translation'], ['lines-of-symmetry', 'coordinates-and-moves']],
  ['translation', 'noun', 'shape', 'Sliding a shape to a new place without turning or flipping it.', '3 right and 2 up: (1, 1) → (4, 3).', ['reflection', 'rotation'], ['coordinates-and-moves']],
  ['rotation', 'noun', 'shape', 'Turning a shape about a fixed point.', 'A quarter turn clockwise about (0, 0).', ['translation', 'clockwise'], ['coordinates-and-moves']],
  ['enlargement', 'noun', 'shape', 'Making a shape bigger or smaller by multiplying every length by the same number.', 'Scale factor 2 turns a 3 cm side into 6 cm.', ['scale factor'], []],
  ['scale factor', 'noun', 'shape', 'The number every length is multiplied by when a shape is made bigger or smaller.', '2 cm by 3 cm, times 3, becomes 6 cm by 9 cm.', ['enlargement'], []],
  ['tessellation', 'noun', 'shape', 'A pattern of shapes that fit together with no gaps and no overlaps.', 'Squares on a chessboard: 4 meet at each corner, 4 × 90° = 360°.', ['hexagon'], ['angles-on-a-line']],
  ['coordinates', 'noun', 'shape', 'A pair of numbers (x, y) that give a point’s position: across first, then up.', '(3, 2) is 3 across and 2 up.', ['axis', 'origin'], ['coordinates-and-moves']],
  ['axis', 'noun', 'shape', 'One of the two number lines on a graph: x goes across, y goes up. Plural: axes.', 'The point (4, 1) is 4 along the x one.', ['coordinates', 'origin'], ['coordinates-and-moves', 'line-graph-read'], { alias: ['axes'] }],
  ['origin', 'noun', 'shape', 'The point (0, 0), where the two axes cross.', '(0, 0).', ['axis', 'coordinates'], ['coordinates-and-moves']],
  ['net', 'noun', 'shape', 'A flat pattern that folds up to make a solid.', '6 squares in a cross fold into a cube.', ['cube', 'face'], ['faces-edges-vertices']],
  ['cube', 'noun', 'shape', 'A solid with six square faces, all the same size.', '12 edges and 8 vertices.', ['cuboid', 'cube number', 'net'], ['faces-edges-vertices', 'volume-cuboid']],
  ['cuboid', 'noun', 'shape', 'A box shape: a solid with six rectangular faces.', 'A box 30 cm × 20 cm × 10 cm.', ['cube', 'volume'], ['volume-cuboid']],
  ['prism', 'noun', 'shape', 'A solid with the same cross-section all the way along its length.', 'A triangular one has 5 faces, like a tent.', ['cylinder'], ['faces-edges-vertices']],
  ['pyramid', 'noun', 'shape', 'A solid with a flat base and triangular faces that meet at one point on top.', 'A square-based one has 5 faces.', ['prism'], ['faces-edges-vertices']],
  ['cylinder', 'noun', 'shape', 'A solid with two equal circles at its ends and one curved face joining them.', 'A tin 7 cm across and 11 cm tall.', ['prism'], ['faces-edges-vertices']],
  ['Euler’s formula', 'noun', 'shape', 'For any solid with flat faces and no holes: faces + vertices − edges = 2.', 'A cube: 6 + 8 − 12 = 2.', ['face', 'edge', 'vertex'], ['faces-edges-vertices']],
  ['hypotenuse', 'noun', 'shape', 'The longest side of a right-angled triangle, opposite the right angle.', 'In a 3, 4, 5 triangle it is 5.', ['Pythagoras’ theorem', 'right-angled triangle'], ['kinds-of-triangle']],
  ['Pythagoras’ theorem', 'noun', 'shape', 'In a right-angled triangle, the square on the longest side equals the squares on the other two sides added together: a² + b² = c². (For 13–14.)', '3² + 4² = 9 + 16 = 25 = 5².', ['hypotenuse', 'right-angled triangle'], ['kinds-of-triangle', 'root-of-square']],

  /* ------------------------------------------------------------ measures */
  ['perimeter', 'noun', 'measure', 'The distance all the way round the edge of a flat shape.', '6 cm by 4 cm: 6 + 4 + 6 + 4 = 20 cm.', ['area', 'circumference'], ['perimeter']],
  ['area', 'noun', 'measure', 'How much flat surface a shape covers, counted in squares.', '6 cm by 4 cm: 24 cm².', ['perimeter', 'square centimetre'], ['area-rectangles', 'area-triangles']],
  ['volume', 'noun', 'measure', 'How much space a solid takes up, counted in cubes.', '4 × 3 × 2 = 24 cm³.', ['capacity', 'cubic centimetre'], ['volume-cuboid']],
  ['surface area', 'noun', 'measure', 'The total area of all the faces of a solid.', 'A 1 cm cube: 6 faces × 1 cm² = 6 cm².', ['area', 'net'], ['volume-cuboid']],
  ['capacity', 'noun', 'measure', 'How much a container can hold.', 'A jug that holds 2 litres.', ['volume', 'litre'], ['metric-units']],
  ['mass', 'noun', 'measure', 'How heavy something is — how much stuff it is made of — measured in grams and kilograms.', 'A bag of sugar: 1 kg.', ['gram'], ['metric-units'], { alias: ['weight'] }],
  ['distance', 'noun', 'measure', 'How far it is from one place to another.', '3 hours at 50 km/h covers 150 km.', ['speed'], ['speed-distance-time']],
  ['metric', 'adjective', 'measure', 'Built on tens, hundreds and thousands, like metres, grams and litres.', '1 km = 1,000 m.', ['convert'], ['metric-units']],
  ['metre', 'noun', 'measure', 'The main unit of length in the system built on tens — roughly one long adult stride.', '100 cm = 1 m.', ['centimetre', 'kilometre'], ['metric-units'], { alias: ['meter'] }],
  ['centimetre', 'noun', 'measure', 'One hundredth of a metre — about the width of a fingernail.', '10 mm = 1 cm.', ['metre'], ['metric-units']],
  ['kilometre', 'noun', 'measure', 'One thousand metres.', 'A 5 km run is 5,000 m.', ['metre', 'distance'], ['metric-units']],
  ['gram', 'noun', 'measure', 'A small unit of mass; a paperclip weighs about 1.', '1,000 g = 1 kg.', ['mass'], ['metric-units']],
  ['litre', 'noun', 'measure', 'The main unit of capacity in the system built on tens — a big bottle of water.', '1,000 ml = 1 l.', ['capacity'], ['metric-units'], { alias: ['liter'] }],
  ['convert', 'verb', 'measure', 'Change a measurement into a different unit without changing its size.', '2.5 km = 2,500 m.', ['metric'], ['metric-units']],
  ['square centimetre', 'noun', 'measure', 'The area of a square 1 cm by 1 cm. Written cm².', 'A 3 cm by 2 cm rectangle covers 6 cm².', ['area', 'cubic centimetre'], ['area-rectangles']],
  ['cubic centimetre', 'noun', 'measure', 'The volume of a cube 1 cm by 1 cm by 1 cm. Written cm³.', 'A 1 ml spoonful of water fills 1 cm³.', ['volume', 'square centimetre'], ['volume-cuboid']],
  ['compound shape', 'noun', 'measure', 'A shape made by joining simpler shapes together.', 'An L-shape: 6 × 2 plus 2 × 3 = 12 + 6 = 18 squares.', ['area', 'perimeter'], ['compound-area']],
  ['perpendicular height', 'noun', 'measure', 'The distance straight up from the base to the top, at right angles to the base.', 'Base 6, height 4: triangle area = ½ × 6 × 4 = 12.', ['base', 'perpendicular'], ['area-triangles']],
  ['speed', 'noun', 'measure', 'How far something travels in each unit of time.', '120 km in 2 hours is 60 km/h.', ['rate', 'distance', 'compound measure'], ['speed-distance-time']],
  ['compound measure', 'noun', 'measure', 'A measure made from two others, like kilometres per hour or grams per cubic centimetre.', '90 km/h means 90 km in each hour.', ['speed', 'density', 'rate'], ['speed-distance-time'], { alias: ['compound unit'] }],
  ['density', 'noun', 'measure', 'How much mass is packed into each unit of volume.', '200 g in 100 cm³ is 2 g/cm³.', ['mass', 'volume', 'compound measure'], ['speed-distance-time']],
  ['duration', 'noun', 'measure', 'How long something lasts, from start to finish.', '9:45 to 11:15 lasts 1 hour 30 minutes.', ['24-hour clock'], ['how-long']],
  ['24-hour clock', 'noun', 'measure', 'Telling the time with hours from 00 to 23, so no a.m. or p.m. is needed.', '3:30 p.m. = 15:30.', ['duration', 'analogue clock'], ['twenty-four-hour']],
  ['analogue clock', 'noun', 'measure', 'A clock with hands that sweep round a dial.', 'Short hand on 3, long hand on 6: half past three.', ['24-hour clock', 'clockwise'], ['read-the-clock']],
  ['change', 'noun', 'measure', 'The money given back when you pay more than the price.', 'Pay £5 for something costing £3.40: £1.60 back.', ['subtraction'], ['giving-change']],
  ['scale', 'noun', 'measure', 'A ratio that tells you how lengths on a map or drawing compare with the real ones.', '1 : 100 means 1 cm on paper is 1 m for real.', ['ratio', 'scale factor'], ['ratio-share']],

  /* ------------------------------------------------------------ data */
  ['data', 'noun', 'data', 'Facts and numbers collected to answer a question.', 'The heights of 28 children in a class.', ['tally'], ['pictogram-total']],
  ['tally', 'noun', 'data', 'A way of counting with marks, drawn in bundles of five.', 'Four strokes and one across them make 5.', ['frequency', 'data'], ['pictogram-total']],
  ['frequency', 'noun', 'data', 'How many times something happens or turns up.', '7 children chose blue: blue’s count is 7.', ['tally', 'bar chart'], ['bar-compare']],
  ['pictogram', 'noun', 'data', 'A chart that uses small pictures, each standing for an amount.', '● = 2 children, so ●●● = 6.', ['bar chart'], ['pictogram-total'], { alias: ['pictograph'] }],
  ['bar chart', 'noun', 'data', 'A chart that uses bars of different heights to compare amounts.', 'A bar reaching 12 is 4 more than one reaching 8.', ['pictogram', 'frequency'], ['bar-compare']],
  ['line graph', 'noun', 'data', 'A graph that joins points with lines to show how something changes over time.', 'The temperature at 9, 10, 11 and 12 o’clock.', ['axis', 'bar chart'], ['line-graph-read']],
  ['pie chart', 'noun', 'data', 'A circle cut into slices to show how a whole is shared out.', 'Half the circle, 180°, for “walk to school”.', ['sector', 'fraction'], ['fraction-parts']],
  ['mean', 'noun', 'data', 'The fair-share average: add up all the values, then share the total equally between them.', '3, 5 and 10: 18 ÷ 3 = 6.', ['median', 'mode', 'average'], ['mean-fair-share']],
  ['median', 'noun', 'data', 'The middle value once all the values are put in order.', '2, 3, 7, 8, 12 → 7.', ['mean', 'mode', 'range'], ['median-mode']],
  ['mode', 'noun', 'data', 'The value that turns up most often.', '3, 5, 5, 6, 5, 9 → 5.', ['mean', 'median'], ['median-mode']],
  ['range', 'noun', 'data', 'The biggest value take away the smallest — how spread out the data is.', '4, 9, 12, 20: 20 − 4 = 16.', ['median', 'outlier'], ['data-range']],
  ['average', 'noun', 'data', 'One number that stands for a whole list — the mean, the median or the mode.', 'For 4, 6, 6, 8 all three give 6.', ['mean', 'median', 'mode'], ['mean-fair-share']],
  ['outlier', 'noun', 'data', 'A value far away from all the others.', 'In 5, 6, 7, 6, 42 it is the 42.', ['range'], ['data-range']],

  /* ------------------------------------------------------------ chance */
  ['probability', 'noun', 'chance', 'How likely something is, as a number from 0 (it cannot happen) to 1 (it must).', 'A fair coin landing heads: 1/2.', ['chance', 'outcome', 'equally likely'], ['chance-fraction']],
  ['chance', 'noun', 'chance', 'How likely it is that something will happen.', 'A 1 in 6 chance of rolling a 6 on a dice.', ['probability', 'likely'], ['chance-words']],
  ['certain', 'adjective', 'chance', 'Sure to happen; a probability of 1.', 'Rolling a number less than 7 on an ordinary dice.', ['impossible', 'likely'], ['chance-words']],
  ['impossible', 'adjective', 'chance', 'Cannot happen; a probability of 0.', 'Rolling a 7 on an ordinary dice.', ['certain', 'unlikely'], ['chance-words']],
  ['likely', 'adjective', 'chance', 'More probable to happen than not.', 'Picking red from a bag of 9 red and 1 blue.', ['unlikely', 'even chance'], ['chance-words']],
  ['unlikely', 'adjective', 'chance', 'Less probable to happen than not.', 'Picking blue from a bag of 9 red and 1 blue.', ['likely', 'impossible'], ['chance-words']],
  ['even chance', 'noun', 'chance', 'Exactly as probable to happen as not: a probability of 1/2.', 'Heads on a fair coin: 1/2.', ['likely', 'probability'], ['chance-words'], { alias: ['fifty-fifty'] }],
  ['outcome', 'noun', 'chance', 'One possible result of something like a roll or a spin.', 'A dice has six: 1, 2, 3, 4, 5 and 6.', ['sample space'], ['list-outcomes']],
  ['equally likely', 'adjective', 'chance', 'Having exactly the same chance as each other.', 'Each face of a fair dice: 1/6 each.', ['probability'], ['chance-fraction']],
  ['sample space', 'noun', 'chance', 'A list or table of every possible outcome.', 'Two coins: HH, HT, TH, TT — 4 outcomes.', ['outcome'], ['list-outcomes']],
  ['arrangement', 'noun', 'chance', 'One way of putting things in order, in a row or in named places.', 'A, B and C can go in 6 orders: ABC, ACB, BAC, BCA, CAB and CBA — that is 3! = 6.', ['factorial', 'permutation'], ['arrange-all', 'factorials']],
  ['permutation', 'noun', 'chance', 'A choice of things where the order counts, so ABC and CBA are different. From n things, r in order: n! ÷ (n − r)!.', 'Gold, silver and bronze from 8 runners: 8 × 7 × 6 = 336.', ['combination', 'arrangement', 'factorial'], ['permutations'], { alias: ['npr'] }],
  ['combination', 'noun', 'chance', 'A choice of things where the order does not count, so ABC and CBA are the same group. From n things, r of them: n! ÷ (r! × (n − r)!).', 'A team of 3 from 7 players: 7 × 6 × 5 ÷ 6 = 35.', ['permutation', 'factorial', 'subset'], ['combinations'], { alias: ['ncr', 'choose'] }],

  /* ------------------------------------------------------------ contest & Vedic */
  ['digit root', 'noun', 'contest', 'Add up the digits of a number, then again, until one digit is left — that last digit is it.', '4,787 → 26 → 8.', ['casting out nines', 'divisibility test'], ['digit-root'], { alias: ['digital root'] }],
  ['casting out nines', 'noun', 'contest', 'Checking a calculation by comparing the digit roots of the numbers with the digit root of the answer.', '23 × 14 = 322: roots 5 × 5 = 25 → 7, and 3 + 2 + 2 = 7 ✓', ['digit root'], ['digit-root']],
  ['Vedic maths', 'noun', 'contest', 'A set of mental shortcuts with Sanskrit names, set out by Bharati Krishna Tirtha in a book published in 1965. Scholars who have looked have not found them in the Vedas.', '98 × 97: 2 short and 3 short of 100 → 95 | 06 = 9,506.', ['sutra', 'nikhilam', 'mental maths'], ['nikhilam-100', 'square-five'],
    { alias: ['vedic'], sources: ['Bharati Krishna Tirtha, Vedic Mathematics (Motilal Banarsidass, 1965).', 'S. G. Dani, "Myths and reality: on \'Vedic mathematics\'", Frontline, 1993.'] }],
  ['sutra', 'noun', 'contest', 'A short saying that carries a whole method, like “by one more than the one before”.', 'That one squares 35: 3 × 4 = 12, then 25 → 1,225.', ['Vedic maths', 'nikhilam'], ['square-five', 'crosswise']],
  ['nikhilam', 'noun', 'contest', 'The method “all from nine and the last from ten”: work with how far numbers are from 10, 100 or 1,000.', '1000 − 357: 9 − 3, 9 − 5, 10 − 7 → 643.', ['Vedic maths', 'sutra'], ['all-from-nine', 'nikhilam-100']],
  ['vertically and crosswise', 'phrase', 'contest', 'A way to multiply two-digit numbers in one line: the units, then the cross, then the tens.', '23 × 12: 3 × 2 = 6; 2 × 2 + 3 × 1 = 7; 2 × 1 = 2 → 276.', ['sutra', 'long multiplication'], ['crosswise']],
];

const sortKey = (w) => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const norm = (s) => String(s).toLowerCase().replace(/[’']/g, '').replace(/π/g, 'pi').replace(/[^a-z0-9%]+/g, ' ').trim();
const first = (e) => { const c = sortKey(e.word)[0].toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; };

export const ENTRIES = RAW.map(([word, pos, topic, def, ex, see = [], stops = [], extra = {}]) => ({ word, pos, topic, def, ex, see, stops, alias: extra.alias || [], sources: extra.sources || null }))
  .sort((a, b) => sortKey(a.word).localeCompare(sortKey(b.word)));
const byWord = new Map(ENTRIES.map((e) => [e.word.toLowerCase(), e]));
export const entry = (w) => byWord.get(String(w).toLowerCase());
const stopTitle = Object.fromEntries(TRICKS.map((t) => [t.id, t.title]));
export const LETTERS = [...new Set(ENTRIES.map(first))].sort();

/* Search as you type: exact word, then words that start with the query, then a
   word inside the headword (or an alias) that starts with it, then anywhere in
   the headword, then the definition. Filters narrow before ranking. */
export function search(q, { letter = null, topic = null } = {}) {
  const n = norm(q || '');
  const pool = ENTRIES.filter((e) => (!topic || e.topic === topic) && (!letter || first(e) === letter));
  if (!n) return pool;
  const hits = [];
  for (const e of pool) {
    const w = norm(e.word), al = e.alias.map(norm);
    let s;
    if (w === n || al.includes(n)) s = 0;
    else if (w.startsWith(n)) s = 1;
    else if (al.some((a) => a.startsWith(n))) s = 2;
    else if (w.split(' ').some((p) => p.startsWith(n))) s = 3;
    else if (w.includes(n)) s = 4;
    else if (norm(e.def).split(' ').some((p) => p.startsWith(n)) && n.length > 2) s = 5;
    else continue;
    hits.push([s, e]);
  }
  return hits.sort((a, b) => a[0] - b[0] || sortKey(a[1].word).localeCompare(sortKey(b[1].word))).map((h) => h[1]);
}

/* The same word in every house on the same day. */
export function wordOfDay(d = new Date()) {
  const r = seeded('dictionary:' + dayKey(d));
  return ENTRIES[Math.floor(r() * ENTRIES.length)];
}

/* ------------------------------------------------------------- pictures */

const S = kit.svg, T = kit.text;
function circlePic(mode) {
  const c = 70, r = 56;
  let s = `<circle cx="${c}" cy="${c}" r="${r}" class="dg-blank"/><circle cx="${c}" cy="${c}" r="3.5" class="dg-dot"/>`;
  if (mode === 'radius') s += `<line x1="${c}" y1="${c}" x2="${c + r}" y2="${c}" class="dg-hand2"/>` + T(c + r / 2, c - 8, 'r', 'dg-accent');
  if (mode === 'diameter') s += `<line x1="${c - r}" y1="${c}" x2="${c + r}" y2="${c}" class="dg-hand2"/>` + T(c, c - 8, 'd', 'dg-accent');
  if (mode === 'circumference') s += `<circle cx="${c}" cy="${c}" r="${r}" class="dg-arc"/>` + T(c, c + 5, 'C', 'dg-accent');
  if (mode === 'sector') s += `<path d="M${c},${c} L${c + r},${c} A${r},${r} 0 0 0 ${c},${c - r} Z" class="dg-fill1"/>`;
  return S(2 * c, 2 * c, s, `A circle showing its ${mode}`);
}
function linesPic(kind) {
  let s = '';
  if (kind === 'parallel') s = `<line x1="20" y1="30" x2="200" y2="30" class="dg-line"/><line x1="20" y1="80" x2="200" y2="80" class="dg-line"/><path d="M104,24 l8,6 l-8,6 M104,74 l8,6 l-8,6" class="dg-line"/>`;
  else s = `<line x1="30" y1="100" x2="200" y2="100" class="dg-line"/><line x1="90" y1="100" x2="90" y2="14" class="dg-line"/><path d="M90,86 h14 v14" class="dg-thin"/>`;
  return S(220, 116, s, kind === 'parallel' ? 'Two parallel lines' : 'Two perpendicular lines');
}
function rightAnglePic() {
  return S(170, 130, `<line x1="30" y1="110" x2="160" y2="110" class="dg-line"/><line x1="30" y1="110" x2="30" y2="14" class="dg-line"/><path d="M30,92 h18 v18" class="dg-arc"/>` + T(70, 88, '90°', 'dg-accent'), 'A right angle');
}
function perimeterPic() {
  return S(236, 150, `<rect x="30" y="26" width="170" height="92" class="dg-fill2"/><rect x="30" y="26" width="170" height="92" class="dg-hand2" fill="none" stroke-dasharray="8 6"/>` + T(115, 18, '6 cm') + T(115, 140, '6 cm') + T(16, 76, '4', 'dg-text') + T(216, 76, '4', 'dg-text'), 'A rectangle with its edge traced all the way round');
}
function medianPic() {
  const v = [2, 3, 7, 8, 12]; let s = '';
  v.forEach((x, i) => { const h = x * 9; s += `<rect x="${16 + i * 40}" y="${120 - h}" width="28" height="${h}" rx="3" class="${i === 2 ? 'dg-fill1' : 'dg-fill2'}"/>` + T(30 + i * 40, 136, x, 'dg-small'); });
  return S(220, 142, s, 'Five values in order, the middle one picked out');
}
function symmetryPic() {
  return S(170, 150, `<polygon points="85,14 150,70 85,136 20,70" class="dg-fill2"/><line x1="85" y1="4" x2="85" y2="146" class="dg-hand2" stroke-dasharray="6 5"/>`, 'A kite with a dashed fold line down its middle');
}
function factorTreePic() {
  const n = (x, y, t, leaf) => `<circle cx="${x}" cy="${y}" r="15" class="${leaf ? 'dg-fill3' : 'dg-blank'}"/>` + T(x, y + 5, t, 'dg-text');
  const l = (a, b, c, d) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="dg-thin"/>`;
  return S(220, 160, l(110, 22, 60, 72) + l(110, 22, 160, 72) + l(60, 72, 30, 132) + l(60, 72, 90, 132) + l(160, 72, 130, 132) + l(160, 72, 190, 132)
    + n(110, 22, 60) + n(60, 72, 6) + n(160, 72, 10) + n(30, 132, 2, 1) + n(90, 132, 3, 1) + n(130, 132, 2, 1) + n(190, 132, 5, 1), 'A factor tree for 60');
}
function triDots() {
  let s = ''; for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) s += `<circle cx="${70 - r * 12 + c * 24}" cy="${16 + r * 22}" r="7" class="dg-dot"/>`;
  return S(140, 100, s, 'Ten dots in a triangle');
}
function netPic() {
  const u = 30, cells = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
  return S(4 * u + 8, 3 * u + 8, cells.map(([x, y], i) => `<rect x="${4 + x * u}" y="${4 + y * u}" width="${u}" height="${u}" class="${i === 2 ? 'dg-fill1' : 'dg-fill2'}"/>`).join(''), 'Six squares in a cross: the net of a cube');
}
const tri = (pts, labels) => kit.poly(pts, labels);
const PICS = {
  'right angle': rightAnglePic,
  'angle': () => kit.angle(55, '', 70),
  'acute angle': () => kit.angle(40, '40°', 70),
  'obtuse angle': () => kit.angle(125, '125°', 70),
  'reflex angle': () => kit.angle(250, '250°', 60),
  'perimeter': perimeterPic,
  'area': () => kit.grid(6, 4, new Set(Array.from({ length: 24 }, (_, i) => `${Math.floor(i / 6)},${i % 6}`)), 22),
  'square centimetre': () => kit.grid(3, 2, new Set(['0,0']), 30),
  'volume': () => kit.cuboid(4, 3, 2, 'cm', 20),
  'cuboid': () => kit.cuboid(3, 2, 2, 'cm', 22),
  'circle': () => circlePic('circle'),
  'radius': () => circlePic('radius'),
  'diameter': () => circlePic('diameter'),
  'circumference': () => circlePic('circumference'),
  'sector': () => circlePic('sector'),
  'parallel': () => linesPic('parallel'),
  'perpendicular': () => linesPic('perpendicular'),
  'median': medianPic,
  'Venn diagram': () => kit.venn('Cat', 'Dog', 5, 3, 4, 2),
  'fraction': () => kit.fracBar(4, 3, 220, 36),
  'equivalent fractions': () => kit.fracBar(2, 1, 220, 30) + kit.fracBar(6, 3, 220, 30),
  'square number': () => kit.dots(4, 4),
  'triangular number': triDots,
  'pie chart': () => kit.pie(8, 3, 56),
  'bar chart': () => kit.barChart(['Red', 'Blue', 'Green'], [3, 5, 2], 1),
  'pictogram': () => kit.pictogram(['Mon', 'Tue'], [6, 3], 2),
  'coordinates': () => kit.coords(5, { '(3, 2)': [3, 2] }, 22),
  'number line': () => kit.numberLine(-3, 3, 1, { '-2': '−2' }),
  'line of symmetry': symmetryPic,
  'factor tree': factorTreePic,
  'net': netPic,
  'equilateral triangle': () => tri([[0, 104], [120, 104], [60, 0]], ['5 cm', '5 cm', '5 cm']),
  'isosceles triangle': () => tri([[0, 110], [72, 110], [36, 0]], ['3 cm', '5 cm', '5 cm']),
  'scalene triangle': () => tri([[0, 100], [140, 100], [40, 0]], ['7 cm', '6 cm', '4 cm']),
  'right-angled triangle': () => tri([[0, 90], [120, 90], [0, 0]], ['4', '5', '3']),
  'hypotenuse': () => tri([[0, 90], [120, 90], [0, 0]], ['4', 'c = 5', '3']),
  'parallelogram': () => kit.poly([[30, 0], [170, 0], [140, 80], [0, 80]]),
  'trapezium': () => kit.poly([[40, 0], [120, 0], [160, 80], [0, 80]]),
  'rhombus': () => kit.poly([[70, 0], [140, 60], [70, 120], [0, 60]]),
  'kite': () => kit.poly([[60, 0], [110, 40], [60, 140], [10, 40]]),
  'range': () => kit.numberLine(0, 20, 2, { 4: 'smallest', 20: 'biggest' }),
};
export const hasPic = (w) => !!PICS[w];

/* ------------------------------------------------------------- view */

let live = null;   // the context of the last render, for keys pressed inside the search box
function results(ctx) {
  const ui = ctx.ui;
  return search(ui.q || '', { letter: ui.letter || null, topic: ui.topic || null });
}
const SHOW = 80;

export function view(ctx) {
  live = ctx;
  const ui = ctx.ui, data = ctx.data;
  if ((ui.q || '') !== (ui.lastQ || '')) { ui.sel = 0; ui.lastQ = ui.q || ''; }
  const res = results(ctx), sel = Math.min(ui.sel || 0, Math.max(0, res.length - 1));
  const open = ui.open && entry(ui.open);
  const filtered = !!(ui.q || ui.letter || ui.topic);
  const recent = (data.recent || []).filter((w) => entry(w));
  const wod = wordOfDay();
  const list = res.slice(0, SHOW).map((e, i) => `<li><button class="t-dictionary-item${i === sel ? ' sel' : ''}${open === e ? ' open' : ''}" data-act="lib" data-arg="open|${esc(e.word)}" role="option" aria-selected="${i === sel}">
      <b>${esc(e.word)}</b><i>${esc(e.pos)}</i><span>${esc(e.def)}</span></button></li>`).join('');
  return `<div class="t-dictionary">
    <div class="card t-dictionary-bar">
      <div class="t-dictionary-row">
        <div class="t-dictionary-search">
          <span class="t-dictionary-glass" aria-hidden="true">⌕</span>
          <input id="t-dictionary-q" data-lib-input="q" type="text" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false"
            placeholder="Look up a word, like “median”" value="${esc(ui.q || '')}" aria-label="Look up a word" aria-controls="t-dictionary-list" aria-describedby="t-dictionary-hint">
          ${filtered ? '<button class="btn small ghost" data-act="lib" data-arg="clear" aria-label="Clear the search">Clear <kbd>Esc</kbd></button>' : ''}
        </div>
        <select id="t-dictionary-topic" class="t-dictionary-topicpick" data-lib-input="topic" aria-label="Topic">
          <option value=""${ui.topic ? '' : ' selected'}>All topics</option>
          ${Object.entries(TOPICS).map(([k, v]) => `<option value="${k}"${ui.topic === k ? ' selected' : ''}>${esc(v)}</option>`).join('')}
        </select>
      </div>
      <nav class="t-dictionary-az" aria-label="Browse by letter">${'#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((L) => LETTERS.includes(L)
        ? `<button class="${ui.letter === L ? 'on' : ''}" data-act="lib" data-arg="letter|${L}" aria-pressed="${ui.letter === L}">${L}</button>`
        : `<button disabled aria-hidden="true" tabindex="-1">${L}</button>`).join('')}</nav>
    </div>
    <div class="t-dictionary-cols">
      <div class="t-dictionary-listwrap">
        <p class="t-dictionary-count">${res.length ? `<b class="mono">${res.length}</b> ${res.length === 1 ? 'word' : 'words'}${filtered ? '' : ' in the dictionary'}${res.length > SHOW ? ` — first ${SHOW} shown, pick a letter to see more` : ''}` : `No word matches “${esc(ui.q || '')}”. Try fewer letters.`}</p>
        <ul id="t-dictionary-list" class="t-dictionary-list" role="listbox" aria-label="Words">${list}</ul>
        <p id="t-dictionary-hint" class="t-dictionary-hint"><kbd>↑</kbd> <kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> clear · <kbd>/</kbd> search</p>
      </div>
      <div class="t-dictionary-pane">
        ${open ? entryCard(open) : `
          <section class="card t-dictionary-wod">
            <p class="kicker">Word of the day</p>
            <h2 class="t-dictionary-word">${esc(wod.word)}</h2>
            <p class="t-dictionary-def">${esc(wod.def)}</p>
            <button class="btn small" data-act="lib" data-arg="open|${esc(wod.word)}">Open it →</button>
          </section>`}
        ${recent.length ? `<section class="t-dictionary-recent"><p class="kicker">Looked up lately</p><div class="t-dictionary-chips">${recent.map((w) =>
          `<button class="chip t-dictionary-chip" data-act="lib" data-arg="open|${esc(w)}">${esc(w)}</button>`).join('')}</div></section>` : ''}
      </div>
    </div>
  </div>`;
}

function entryCard(e) {
  const pic = PICS[e.word] ? PICS[e.word]() : '';
  return `<article class="card t-dictionary-entry" aria-live="polite">
    <header class="t-dictionary-head">
      <h2 class="t-dictionary-word">${esc(e.word)}</h2>
      <span class="t-dictionary-pos">${esc(e.pos)}</span>
      <button class="btn small ghost t-dictionary-x" data-act="lib" data-arg="close" aria-label="Close this word">✕</button>
    </header>
    <p class="t-dictionary-tag"><span class="chip">${esc(TOPICS[e.topic])}</span></p>
    <p class="t-dictionary-def">${esc(e.def)}</p>
    <div class="t-dictionary-ex"><span class="kicker">For example</span><p class="mono">${esc(e.ex)}</p></div>
    ${pic ? `<figure class="t-dictionary-pic">${pic}</figure>` : ''}
    ${e.see.length ? `<div class="t-dictionary-see"><span class="kicker">See also</span><div class="t-dictionary-chips">${e.see.map((w) =>
      `<button class="chip t-dictionary-chip" data-act="lib" data-arg="open|${esc(w)}">${esc(w)}</button>`).join('')}</div></div>` : ''}
    ${e.stops.length ? `<div class="t-dictionary-stops"><span class="kicker">Learn it in the Atlas</span><div class="t-dictionary-chips">${e.stops.map((s) =>
      `<button class="btn small" data-act="lib" data-arg="stop|${esc(s)}">${icon('pin', 16)} ${esc(stopTitle[s] || s)}</button>`).join('')}</div></div>` : ''}
    ${e.sources ? `<details class="t-dictionary-src"><summary>Sources</summary><ul>${e.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details>` : ''}
  </article>`;
}

function remember(ctx, w) {
  const r = (ctx.data.recent || []).filter((x) => x !== w);
  r.unshift(w); ctx.data.recent = r.slice(0, 8); ctx.save();
}

export function act(name, arg, ctx) {
  const ui = ctx.ui;
  if (name === 'open') { const e = entry(arg); if (!e) return; ui.open = e.word; const i = results(ctx).indexOf(e); if (i >= 0) ui.sel = i; remember(ctx, e.word); ctx.sfx.click(); }
  else if (name === 'close') ui.open = null;
  else if (name === 'clear') { ui.q = ''; ui.lastQ = ''; ui.letter = null; ui.topic = null; ui.sel = 0; }
  else if (name === 'letter') { ui.letter = ui.letter === arg ? null : arg; ui.sel = 0; }
  else if (name === 'topic') { ui.topic = ui.topic === arg ? null : arg; ui.sel = 0; }
  else if (name === 'move') { const n = results(ctx).slice(0, SHOW).length; if (n) ui.sel = ((ui.sel || 0) + (+arg || 0) + n) % n; }
  else if (name === 'stop') ctx.openStop(arg);
}

export function key(e, ctx) {
  const ui = ctx.ui;
  if (e.target && e.target.tagName === 'SELECT') return false;   // the topic picker keeps its own arrow keys
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    act('move', e.key === 'ArrowDown' ? 1 : -1, ctx);
    if (typeof document !== 'undefined') setTimeout(() => { const el = document.querySelector('.t-dictionary-item.sel'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); });
    return true;
  }
  if (e.key === 'Enter') { const r = results(ctx)[Math.min(ui.sel || 0, SHOW - 1)]; if (!r) return false; act('open', r.word, ctx); return true; }
  if (e.key === 'Escape') {
    if (ui.open) { ui.open = null; return true; }
    if (ui.q || ui.letter || ui.topic) { act('clear', '', ctx); return true; }
    return false;
  }
  if (e.key === '/' && typeof document !== 'undefined') { setTimeout(() => { const el = document.getElementById('t-dictionary-q'); if (el) el.focus(); }); return true; }
  return false;
}

/* The host passes keys to key() only when no input has focus; the search box
   needs ↑ ↓ Enter Esc too, so they are caught here and routed through the same
   key() with the last context drawn. */
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (!live || !e.target || e.target.id !== 't-dictionary-q') return;
    if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) return;
    live.ui.q = e.target.value;
    if (key(e, live)) { e.preventDefault(); e.stopPropagation(); live.render(); }
  }, true);
}

export const CSS = `
.t-dictionary{display:flex;flex-direction:column;gap:16px}
.t-dictionary-bar{display:flex;flex-direction:column;gap:10px}
.t-dictionary-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.t-dictionary-row .t-dictionary-search{flex:1 1 260px;min-width:0}
.t-dictionary-topicpick{flex:0 1 200px;min-width:150px;font:650 var(--fs-label) var(--ui);padding:12px 14px;border:1.5px solid var(--line);border-radius:var(--r-pill);background:var(--surface);color:var(--ink);cursor:pointer}
.t-dictionary-topicpick:focus-visible{outline:none;border-color:var(--action);box-shadow:var(--focus)}
.t-dictionary-search{display:flex;align-items:center;gap:8px;border:1.5px solid var(--line);border-radius:var(--r-pill);background:var(--paper);padding:4px 6px 4px 14px}
.t-dictionary-search:focus-within{border-color:var(--action);box-shadow:var(--focus)}
.t-dictionary-glass{font-size:20px;color:var(--muted)}
.t-dictionary-search input{flex:1;min-width:0;border:0;background:transparent;color:var(--ink);font:500 var(--fs-lead) var(--ui);padding:10px 0;outline:none}
.t-dictionary-search input:focus,.t-dictionary-search input:focus-visible{outline:none;box-shadow:none}
.t-dictionary-hint{margin:8px 0 0;color:var(--muted);font-size:var(--fs-meta)}
.t-dictionary-hint kbd{font-family:var(--mono)}
.t-dictionary-az{display:flex;flex-wrap:wrap;gap:3px}
.t-dictionary-az button{min-width:30px;min-height:32px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface);color:var(--ink);font:700 13px var(--mono);cursor:pointer}
.t-dictionary-az button:disabled{opacity:.3;cursor:default}
.t-dictionary-az button.on{background:var(--action);color:var(--action-ink);border-color:transparent}
@media (max-width:899px){.t-dictionary-az{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin;padding-bottom:2px}.t-dictionary-az button{flex:none;min-width:44px;min-height:44px}}   /* P3: 44px letters on a phone, one swipeable row */
.t-dictionary-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:18px;align-items:start}
.t-dictionary-pane{position:sticky;top:12px;display:flex;flex-direction:column;gap:14px}
@media (max-width:760px){.t-dictionary-cols{grid-template-columns:1fr}.t-dictionary-pane{order:-1;position:static}}
.t-dictionary-count{margin:0 0 8px;color:var(--muted);font-size:var(--fs-label)}
.t-dictionary-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;max-height:70vh;overflow:auto}
.t-dictionary-item{width:100%;text-align:left;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--r-md);padding:9px 13px;cursor:pointer;display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:baseline}
.t-dictionary-item b{font-family:var(--display);font-size:17px}
.t-dictionary-item i{color:var(--muted);font-size:var(--fs-meta)}
.t-dictionary-item span{grid-column:1/-1;color:var(--muted);font-size:var(--fs-label);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t-dictionary-item:hover{border-color:var(--action)}
.t-dictionary-item.sel{border-color:var(--action);background:var(--action-tint)}
.t-dictionary-item.open b{color:var(--action)}
.t-dictionary-head{display:flex;align-items:baseline;gap:10px}
.t-dictionary-word{font-family:var(--display);font-size:clamp(26px,4vw,34px);margin:0;line-height:1.1}
.t-dictionary-pos{font-style:italic;color:var(--muted)}
.t-dictionary-x{margin-left:auto}
.t-dictionary-tag{margin:4px 0 8px}
.t-dictionary-def{font-size:var(--fs-lead);line-height:1.55;margin:6px 0 12px}
.t-dictionary-ex{background:var(--surface2);border-left:4px solid var(--treasure);border-radius:var(--r-sm);padding:10px 14px;margin-bottom:12px}
.t-dictionary-ex p{margin:4px 0 0;font-size:var(--fs-lead)}
.t-dictionary-pic{margin:0 0 12px;display:flex;flex-direction:column;align-items:center}
.t-dictionary-see,.t-dictionary-stops{margin-top:10px}
.t-dictionary-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.t-dictionary-chip{border:1px solid var(--line);cursor:pointer;color:var(--ink)}
.t-dictionary-chip:hover{border-color:var(--action);color:var(--action)}
.t-dictionary-src{margin-top:12px;color:var(--muted);font-size:var(--fs-label)}
.t-dictionary-wod{border-top:4px solid var(--treasure)}
.t-dictionary-recent .kicker{margin-bottom:0}
`;

/* ------------------------------------------------------------- selftest */

export function selftest(ok, makeCtx) {
  const stopIds = new Set(TRICKS.map((t) => t.id));
  ok(ENTRIES.length >= 180, `dictionary: ${ENTRIES.length} entries, want at least 180`);
  ok(ENTRIES.length <= 250, `dictionary: ${ENTRIES.length} entries, want at most 250`);
  const seen = new Set();
  for (const e of ENTRIES) {
    const w = e.word.toLowerCase();
    ok(!seen.has(w), `dictionary: duplicate word ${e.word}`); seen.add(w);
    ok(e.word && e.pos && e.def && e.ex, `dictionary/${e.word}: needs word, part of speech, definition and example`);
    ok(TOPICS[e.topic], `dictionary/${e.word}: unknown topic ${e.topic}`);
    const re = new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    ok(!re.test(e.def), `dictionary/${e.word}: the definition uses the word itself`);
    ok(/\d/.test(e.ex), `dictionary/${e.word}: the example needs real numbers`);
    ok(e.def.length <= 220, `dictionary/${e.word}: definition too long for one sentence a child can hold`);
    for (const s of e.see) ok(entry(s) && s !== e.word, `dictionary/${e.word}: see-also “${s}” does not exist`);
    for (const s of e.stops) ok(stopIds.has(s), `dictionary/${e.word}: stop ${s} is not an Atlas stop`);
    // search finds each word by its prefix, and the whole word ranks first
    const n = norm(e.word);
    for (const len of [1, 2, 3, Math.min(5, n.length)]) ok(search(n.slice(0, len)).includes(e), `dictionary: prefix “${n.slice(0, len)}” does not find ${e.word}`);
    ok(search(e.word)[0] === e, `dictionary: searching “${e.word}” does not put it first`);
    if (PICS[e.word]) { const p = PICS[e.word](); ok(p.startsWith('<svg') && !/undefined|NaN/.test(p), `dictionary/${e.word}: picture is not clean SVG`); }
    if (e.sources) ok(e.sources.length >= 1, `dictionary/${e.word}: empty sources`);
  }
  for (const w of Object.keys(PICS)) ok(entry(w), `dictionary: a picture for a word that is not in the book: ${w}`);
  ok(Object.keys(PICS).length >= 20, 'dictionary: at least 20 words have a picture');
  // prefix matches come before matches inside a word or a definition
  const r = search('squ');
  ok(r.length && r.slice(0, 5).every((e) => norm(e.word).startsWith('squ')), 'dictionary: prefix matches first');
  ok(search('hcf')[0] === entry('highest common factor'), 'dictionary: an alias (HCF) finds its word');
  ok(search('median', { topic: 'shape' }).length === 0, 'dictionary: a topic filter narrows the search');
  ok(search('', { letter: 'V' }).every((e) => /^v/i.test(e.word)), 'dictionary: the letter strip filters by first letter');
  ok(search('zzqx').length === 0, 'dictionary: nonsense finds nothing');
  // word of the day: deterministic, and changes over a month
  const d1 = new Date(2026, 0, 5), days = new Set();
  ok(wordOfDay(d1) === wordOfDay(new Date(2026, 0, 5, 18)), 'dictionary: word of the day is the same all day');
  for (let i = 0; i < 30; i++) days.add(wordOfDay(new Date(2026, 0, 1 + i)).word);
  ok(days.size > 10, 'dictionary: word of the day changes from day to day');
  // flows: type, arrow, enter opens and remembers; escape closes then clears
  const c = makeCtx('dictionary', '8-10');
  c.ui.q = 'med'; let h = view(c);
  ok(h.includes('t-dictionary-item sel') && h.includes('median'), 'dictionary: typing shows results with the first selected');
  key({ key: 'ArrowDown' }, c); ok(c.ui.sel === 1, 'dictionary: ↓ moves the selection');
  key({ key: 'ArrowUp' }, c); ok(c.ui.sel === 0, 'dictionary: ↑ moves it back');
  key({ key: 'Enter' }, c); ok(c.ui.open === 'median', 'dictionary: Enter opens the selected word');
  ok(c.data.recent && c.data.recent[0] === 'median', 'dictionary: an opened word is remembered');
  h = view(c); ok(h.includes('t-dictionary-entry') && h.includes('Learn it in the Atlas') && h.includes('<svg'), 'dictionary: the entry shows its picture and Atlas link');
  key({ key: 'Escape' }, c); ok(!c.ui.open, 'dictionary: Escape closes the entry');
  key({ key: 'Escape' }, c); ok(!c.ui.q, 'dictionary: a second Escape clears the search');
  ok(key({ key: 'Escape' }, c) === false, 'dictionary: Escape with nothing to clear is not swallowed');
  act('open', 'prime number', c); act('open', 'factor', c); act('open', 'prime number', c);
  ok(c.data.recent.join() === 'prime number,factor,median', 'dictionary: recent words, newest first, no repeats');
  act('letter', 'Q', c); ok(search('', { letter: 'Q' }).length >= 2 && view(c).includes('quotient'), 'dictionary: the letter strip shows its words');
  act('clear', '', c); act('topic', 'chance', c); ok(!view(c).includes('>quotient<'), 'dictionary: a topic chip filters the list');
  let opened = null; c.openStop = (s) => { opened = s; }; act('stop', 'median-mode', c); ok(opened === 'median-mode', 'dictionary: an Atlas link opens the stop');
  c.ui.q = '<img src=x>'; ok(!view(c).includes('<img src=x>'), 'dictionary: user input is escaped');
}
