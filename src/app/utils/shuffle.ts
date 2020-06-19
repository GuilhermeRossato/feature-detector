export function shuffle(array: any[]) {
  var currentIndex = array.length, temporaryValue: any, randomIndex: number;

  // While there remain elements to shuffle
  while (currentIndex >= 1) {

    // Pick a element
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // Swap it with the current element
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}
